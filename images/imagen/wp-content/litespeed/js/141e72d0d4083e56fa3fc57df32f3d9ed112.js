(function($){"use strict";const initLocationDistanceFilter=function(){window.JetSmartFilters.filtersList.JetEngineLocationDistance='jet-smart-filters-location-distance';window.JetSmartFilters.filters.JetEngineLocationDistance=class JetEngineLocationDistance extends window.JetSmartFilters.filters.Search{name='location-distance';currentLocationVerbose='Your current location';defaultLocation=null;$locationParent=null;$locationInput=null;$locationDropdown=null;$distanceInput=null;constructor($container){const $filter=$container.find('.jsf-location-distance');super($container,$filter);this.locationData={};this.$locationParent=$filter.find('.jsf-location-distance__location');this.$locationInput=$filter.find('.jsf-location-distance__location-input');this.$locationDropdown=$filter.find('.jsf-location-distance__location-dropdown');this.$distanceInput=$filter.find('.jsf-location-distance__distance');if($filter.data('geolocation-placeholder')){this.currentLocationVerbose=$filter.data('geolocation-placeholder')}
this.$distanceInput.on('change',(event)=>{this.updateLocationData({distance:event.target.value})});this.defaultLocation=$filter.data('current-location');if(this.defaultLocation){this.updateLocationData(this.defaultLocation,!0)}
if(this.defaultLocation.address){this.$locationInput.val(this.defaultLocation.address)}
if(this.defaultLocation.distance){this.selectDistance(this.defaultLocation.distance)}
this.$locationInput.on('keyup',(event)=>{var keyCode=(event.keyCode?event.keyCode:event.which);if(event.target.value.length){this.switchClear(!0);this.switchLocate()}else{this.switchClear();this.switchLocate(!0)}
if(3>event.target.value.length){this.clearDropdown();return}
this.updateLocationData({address:event.target.value,},!0);if(13===keyCode){this.maybeApplyFilter();this.clearDropdown();return}
$.ajax({url:window.JetMapListingLocationDistanceFilterData.apiAutocomplete,type:'GET',dataType:'json',data:{query:event.target.value},}).done((response)=>{this.clearDropdown();if(!response||!response.success){return}
this.$locationDropdown.addClass('is-active');for(var i=0;i<response.data.length;i++){this.$locationDropdown.append('<div class="jsf-location-distance__location-dropdown-item" data-address="'+response.data[i].address+'">'+response.data[i].address+'</div>')}})});this.$locationDropdown.on('click','.jsf-location-distance__location-dropdown-item',(event)=>{const $dropdownItem=$(event.target);this.$locationInput.val($dropdownItem.data('address'));this.clearDropdown();this.updateLocationData({address:$dropdownItem.data('address'),latitude:0,longitude:0,})});this.$locationParent.on('click','.jsf-location-distance__location-clear',(event)=>{this.reset()});this.$locationParent.on('click','.jsf-location-distance__location-locate',(event)=>{this.switchLocate();this.switchLoading(!0);navigator.geolocation.getCurrentPosition((position)=>{this.switchLoading();this.$locationInput.val(this.currentLocationVerbose);this.switchClear(!0);this.updateLocationData({address:0,latitude:position.coords.latitude,longitude:position.coords.longitude,})})});$(document).on('click',(event)=>{const $parent=$(event.target).closest('.jsf-location-distance__location');if(!$parent.length){this.clearDropdown()}})}
maybeApplyFilter(){const applyOn=['ajax','mixed'];if(!applyOn.includes(this.applyType)){return}
this.emitFiterApply()}
reset(){this.resetLocationData(!1)}
resetLocationData(silent){this.updateLocationData({},silent,['address','longitude','latitude','distance']);this.clearDistance();this.clearLocation()}
setData(newData){this.resetLocationData(!0);if(newData){this.updateLocationData({...newData},!0)}
if(newData&&undefined!==newData.address){if(0==newData.address&&newData.latitude&&newData.longitude){this.$locationInput.val(this.currentLocationVerbose)}else{this.$locationInput.val(newData.address)}
this.switchClear(!0);this.switchLocate()}
if(newData&&newData.distance){this.selectDistance(newData.distance)}}
selectDistance(distance){this.clearDistance();this.$distanceInput.find('option[value="'+distance+'"]').prop('selected',!0).attr('selected',!0)}
clearDistance(){this.$distanceInput.find('option[selected]').removeProp('selected').removeAttr('selected')}
get activeValue(){if(!this.hasLocation()&&!this.locationData.distance){return!1}
const activeValue=[];if(this.locationData.address&&0!=this.locationData.address){activeValue.push(this.locationData.address)}else if(this.locationData.latitude&&this.locationData.longitude){activeValue.push(this.currentLocationVerbose)}
activeValue.push(this.locationData.distance+this.locationData.units);return activeValue.join(', ')}
locationDataIsEmpty(){if(!this.locationData||0===Object.keys(this.locationData).length){return!0}
if(!this.hasLocation()&&!this.locationData.distance){return!0}
return!1}
get data(){if(this.dataValue&&!this.disabled){return{...this.dataValue}}else if(!this.locationDataIsEmpty()&&!this.disabled){return{...this.locationData}}else{return!1}}
processData(){if(!this.locationDataIsEmpty){this.dataValue={...this.locationData}}else{this.dataValue=!1}}
clearLocation(){this.$locationInput.val('');this.clearDropdown();this.switchClear();this.switchLocate(!0)}
hasLocation(){if(!this.locationData||(!this.locationData.address&&!this.locationData.latitude&&!this.locationData.longitude)){return!1}else{return!0}}
clearDropdown(){this.$locationDropdown.html('').removeClass('is-active')}
switchClear(show){if(show&&!this.$locationParent.hasClass('jsf-show-clear')){this.$locationParent.addClass('jsf-show-clear')}else if(!show){this.$locationParent.removeClass('jsf-show-clear')}}
switchLoading(show){if(show&&!this.$locationParent.hasClass('jsf-show-loading')){this.$locationParent.addClass('jsf-show-loading')}else if(!show){this.$locationParent.removeClass('jsf-show-loading')}}
switchLocate(show){if(!navigator.geolocation){this.$locationParent.removeClass('jsf-show-locate');return}
if(show&&!this.$locationParent.hasClass('jsf-show-locate')){this.$locationParent.addClass('jsf-show-locate')}else if(!show){this.$locationParent.removeClass('jsf-show-locate')}}
updateLocationData(newData,silent,deleteData){if(0!==Object.keys(newData).length){for(const prop in newData){this.locationData[prop]=newData[prop]}
if(!this.locationData.distance){this.locationData.distance=this.$distanceInput.data('default')}
if(!this.locationData.units){this.locationData.units=this.$distanceInput.data('units')}}
if(deleteData){for(var i=0;i<deleteData.length;i++){delete this.locationData[deleteData[i]]}}
if(!silent){this.emitFiterChange();this.maybeApplyFilter()}}}}
window.addEventListener('DOMContentLoaded',()=>{if(window.JetSmartFilters&&-1===window.JetSmartFilters.filterNames.indexOf('location-distance')){window.JetSmartFilters.filterNames.push('location-distance')}});if(window.JetMapListingGeolocationFilterData&&'jet-smart-filters/before-init'===window.JetMapListingGeolocationFilterData.initEvent){document.addEventListener('jet-smart-filters/before-init',(e)=>{initLocationDistanceFilter()})}else{window.addEventListener('DOMContentLoaded',(e)=>{initLocationDistanceFilter()})}}(jQuery))
;