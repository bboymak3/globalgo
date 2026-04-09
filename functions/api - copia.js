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
        // --- 1. GUARDAR DATOS (POST) ---
        if (request.method === "POST") {
            const data = await request.json();
            await env.DB.prepare("INSERT OR IGNORE INTO Clientes (placa) VALUES (?)").bind(data.placa).run();

            if (data.tipo === 'OT') {
                await env.DB.prepare(`
                    INSERT INTO Eventos (cliente_id, fecha_hora, tecnico_nombre, kilometraje, notas_exigibles)
                    VALUES ((SELECT id FROM Clientes WHERE placa = ?), datetime('now', 'localtime'), ?, ?, ?)
                `).bind(data.placa, data.tecnico, data.km, data.detalles).run();
                return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
            } else {
                await env.DB.prepare(`
                    INSERT INTO Citas (cliente_id, fecha_cita, hora_cita, servicio, whatsapp, estado)
                    VALUES ((SELECT id FROM Clientes WHERE placa = ?), ?, ?, ?, ?, 'Pendiente')
                `).bind(data.placa, data.fecha, data.hora, data.servicio, data.whatsapp).run();
                return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
            }
        }

        // --- 2. ACTUALIZAR ESTADO (PATCH) ---
        if (request.method === "PATCH") {
            const { id, nuevoEstado } = await request.json();
            await env.DB.prepare("UPDATE Citas SET estado = ? WHERE id = ?").bind(nuevoEstado, id).run();
            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }

        // --- 3. CONSULTAR DATOS (GET) ---
        if (request.method === "GET") {
            const placa = url.searchParams.get("placa");
            const tipo = url.searchParams.get("tipo");
            const periodo = url.searchParams.get("periodo");

            // NUEVO: Lógica de Historial para el Panel Admin
            if (tipo === "historial") {
                const { results } = await env.DB.prepare(`
                    SELECT fecha_hora, kilometraje, notas_exigibles FROM Eventos 
                    WHERE cliente_id = (SELECT id FROM Clientes WHERE placa = ?)
                    ORDER BY id DESC
                `).bind(placa).all();
                return new Response(JSON.stringify(results), { headers: corsHeaders });
            }

            // Consulta de Estatus para el Cliente
            if (tipo === "consulta") {
                const { results } = await env.DB.prepare(`
                    SELECT estado, fecha_cita, servicio FROM Citas ct 
                    JOIN Clientes c ON c.id = ct.cliente_id 
                    WHERE c.placa = ? ORDER BY ct.id DESC LIMIT 1
                `).bind(placa).all();
                return new Response(JSON.stringify(results), { headers: corsHeaders });
            }

            // Listado de Citas (Panel)
            let sql = "SELECT ct.id, c.placa, ct.fecha_cita, ct.hora_cita, ct.servicio, ct.whatsapp, ct.estado FROM Citas ct JOIN Clientes c ON c.id = ct.cliente_id ";
            if (periodo === "hoy") sql += "WHERE ct.fecha_cita = date('now', 'localtime') ";
            else if (periodo === "ayer") sql += "WHERE ct.fecha_cita = date('now', '-1 day', 'localtime') ";
            
            sql += "ORDER BY ct.fecha_cita DESC, ct.hora_cita ASC";
            const { results } = await env.DB.prepare(sql).all();
            return new Response(JSON.stringify(results), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}
