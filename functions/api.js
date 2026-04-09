export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        // ---------------------------------------------------------
        // RUTA A: CREAR COTIZACIÓN (POST)
        // ---------------------------------------------------------
        if (request.method === "POST" && url.searchParams.get("accion") === "crear_cotizacion") {
            try {
                const data = await request.json();

                if (!data.placa || !data.monto || !data.whatsapp) {
                    return new Response(JSON.stringify({ error: "Faltan datos críticos" }), { 
                        status: 400, headers: corsHeaders 
                    });
                }

                // Asegurar cliente
                await env.DB.prepare("INSERT OR IGNORE INTO Clientes (placa) VALUES (?)").bind(data.placa).run();

                // Generar Token
                const token = crypto.randomUUID(); 
                
                // Insertar
                const stmt = env.DB.prepare(`
                    INSERT INTO Cotizaciones (cliente_id, placa, tecnico, kilometraje, detalles, monto, whatsapp, estado, token, fecha_creacion)
                    VALUES ((SELECT id FROM Clientes WHERE placa = ?), ?, ?, ?, ?, ?, 'Pendiente', ?, datetime('now'))
                `);
                
                await stmt.bind(
                    data.placa, data.placa, data.tecnico || 'No asignado', data.km || 0, 
                    data.detalles || 'Sin detalles', data.monto, data.whatsapp, token 
                ).run();
                
                // RETORNAR TOKEN
                return new Response(JSON.stringify({ success: true, token: token }), { headers: corsHeaders });

            } catch (dbError) {
                console.error("Error DB:", dbError);
                return new Response(JSON.stringify({ error: "Error en base de datos: " + dbError.message }), { 
                    status: 500, headers: corsHeaders 
                });
            }
        }

        // ---------------------------------------------------------
        // RUTA B: PÁGINA DE APROBACIÓN (GET)
        // ---------------------------------------------------------
        if (request.method === "GET" && url.pathname.startsWith("/aprobar")) {
            const token = url.searchParams.get("token");
            const { results } = await env.DB.prepare("SELECT * FROM Cotizaciones WHERE token = ?").bind(token).all();
            
            if (results.length === 0) return new Response("Enlace inválido", { status: 404 });
            const cot = results[0];

            if (cot.estado === 'Aprobado') {
                return new Response(`
                    <!DOCTYPE html><body style="font-family:sans-serif; text-align:center; padding:20px; background:#f0f9ff;">
                    <div style="background:white; padding:40px; border-radius:10px; max-w:400px; margin:50px auto; box-shadow:0 10px 25px rgba(0,0,0,0.1);">
                        <div style="font-size:60px;">✅</div><h2 style="color:#0369a1; margin:10px 0;">¡Aprobado!</h2><p style="color:#64748b;">Su firma ha sido registrada.</p>
                    </div></body>
                `, { headers: { "Content-Type": "text/html" } });
            }

            return new Response(`
            <!DOCTYPE html>
            <html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Autorizar</title><script src="https://cdn.tailwindcss.com"></script><style>body{overscroll-behavior:none}canvas{touch-action:none}</style></head>
            <body class="bg-slate-100 min-h-screen flex items-center justify-center p-4">
                <div class="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border-t-8 border-blue-900 p-6">
                    <div class="text-center mb-6"><h2 class="text-xl font-bold text-slate-800">Orden de Trabajo</h2><span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full uppercase font-bold">Placa: ${cot.placa}</span></div>
                    <div class="bg-slate-50 p-4 rounded-xl mb-6 border border-slate-200"><div class="flex justify-between items-end mb-2"><span class="text-slate-500 text-sm">Total Estimado</span><span class="text-3xl font-black text-slate-900">$${cot.monto}</span></div><p class="text-slate-600 text-sm">${cot.detalles}</p><p class="text-slate-400 text-xs mt-3 text-right">Técnico: ${cot.tecnico} | KM: ${cot.kilometraje}</p></div>
                    <p class="text-center text-slate-500 text-sm mb-2 font-medium">Firme con su dedo</p>
                    <div class="relative border-2 border-dashed border-slate-300 rounded-lg bg-white mb-6 shadow-inner"><canvas id="sig-canvas" width="400" height="200" class="w-full h-48 cursor-crosshair"></canvas><button onclick="limpiarFirma()" class="absolute top-2 right-2 bg-red-50 text-red-500 text-xs font-bold px-3 py-1 rounded hover:bg-red-100 border border-red-200">BORRAR</button></div>
                    <button id="btnFirmar" onclick="enviarFirma()" class="w-full bg-blue-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-800">FIRMAR Y ACEPTAR</button>
                </div>
                <script>
                const canvas = document.getElementById('sig-canvas'); const ctx = canvas.getContext('2d'); let drawing = false;
                function resizeCanvas(){ const r=canvas.parentNode.getBoundingClientRect(); canvas.width=r.width; canvas.height=200; ctx.lineWidth=3; ctx.lineCap='round'; ctx.strokeStyle='#000'; }
                setTimeout(resizeCanvas,100); window.addEventListener('resize',resizeCanvas);
                function s(e){drawing=true;ctx.beginPath();d(e);}function e(){drawing=false;ctx.beginPath();}function d(e){if(!drawing)return;e.preventDefault(); const r=canvas.getBoundingClientRect(); const x=(e.touches?e.touches[0].clientX:e.clientX)-r.left; const y=(e.touches?e.touches[0].clientY:e.clientY)-r.top; ctx.lineTo(x,y); ctx.stroke();}
                canvas.addEventListener('mousedown',s); canvas.addEventListener('mouseup',e); canvas.addEventListener('mousemove',d); canvas.addEventListener('touchstart',s,{passive:false}); canvas.addEventListener('touchend',e); canvas.addEventListener('touchmove',d,{passive:false});
                function limpiarFirma(){ctx.clearRect(0,0,canvas.width,canvas.height);}
                async function enviarFirma(){ const i=canvas.toDataURL(); const b=document.getElementById('btnFirmar'); b.innerHTML="PROCESANDO..."; b.disabled=true; try{ const res=await fetch('?token=${token}&confirmar_firma=si',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({firma:i})}); if(res.ok){ document.body.innerHTML='<div class="flex flex-col items-center justify-center h-full"><div class="text-6xl mb-4">✅</div><h1 class="text-2xl font-bold">¡Gracias!</h1><p class="text-slate-500">Autorización enviada.</p></div>'; }else{alert("Error"); b.disabled=false; b.innerHTML="REINTENTAR"; } }catch(e){alert("Error red"); b.disabled=false; }}
                </script></body></html>
            `, { headers: { "Content-Type": "text/html" } });
        }

        // ---------------------------------------------------------
        // RUTA C: RECIBIR FIRMA (POST)
        // ---------------------------------------------------------
        if (request.method === "POST" && url.pathname.startsWith("/aprobar") && url.searchParams.get("confirmar_firma") === "si") {
            const token = url.searchParams.get("token");
            const data = await request.json();
            await env.DB.prepare("UPDATE Cotizaciones SET estado = 'Aprobado', firma_imagen = ? WHERE token = ?").bind(data.firma, token).run();
            return new Response("OK");
        }

        // ---------------------------------------------------------
        // RUTA D: CONSULTAR ESTADO (GET)
        // ---------------------------------------------------------
        if (request.method === "GET" && url.searchParams.get("tipo") === "estado_aprobacion") {
            const placa = url.searchParams.get("placa");
            const { results } = await env.DB.prepare("SELECT * FROM Cotizaciones WHERE placa = ? ORDER BY id DESC LIMIT 5").bind(placa).all();
            return new Response(JSON.stringify(results), { headers: corsHeaders });
        }

        // --- LEGADO ---
        if (request.method === "POST") {
            const data = await request.json();
            if (data.tipo === 'OT') {
                await env.DB.prepare("INSERT OR IGNORE INTO Clientes (placa) VALUES (?)").bind(data.placa).run();
                await env.DB.prepare(`INSERT INTO Eventos (cliente_id, fecha_hora, tecnico_nombre, kilometraje, notas_exigibles) VALUES ((SELECT id FROM Clientes WHERE placa = ?), datetime('now', 'localtime'), ?, ?, ?)`).bind(data.placa, data.tecnico, data.km, data.notas).run();
                return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
            }
        }

        return new Response("OK", { headers: corsHeaders });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}