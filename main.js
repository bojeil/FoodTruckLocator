//https://data.sfgov.org/Economy-and-Community/Mobile-Food-Facility-Permit/rqzj-sfat?

/** Converts numeric degrees to radians */
if (typeof(Number.prototype.toRad) === "undefined") {
  Number.prototype.toRad = function() {
    return this * Math.PI / 180;
  }
}
function distance(lon1, lat1, lon2, lat2) {
	var R = 6371; // Radius of the earth in km
	var dLat = (lat2-lat1).toRad();  // Javascript functions in radians
	var dLon = (lon2-lon1).toRad(); 
	var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
		  Math.cos(lat1.toRad()) * Math.cos(lat2.toRad()) * 
		  Math.sin(dLon/2) * Math.sin(dLon/2); 
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
	var d = R * c; // Distance in km
	return d;
}

function kmToMiles(km){
	return km * 0.62137;
}

function getDayLabel(day){
	var labels = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
	day = parseInt(day,10);
	if(typeof labels[day] == "undefined")
		return "N/A";
	return labels[day];
}

function getTimeLabel(time){
	var labels = {};
	labels["00:00"] = "12AM";
	labels["01:00"] = "1AM";
	labels["02:00"] = "2AM";
	labels["03:00"] = "3AM";
	labels["04:00"] = "4AM";
	labels["05:00"] = "5AM";
	labels["06:00"] = "6AM";
	labels["07:00"] = "7AM";
	labels["08:00"] = "8AM";
	labels["09:00"] = "9AM";
	labels["10:00"] = "10AM";
	labels["11:00"] = "11AM";
	labels["12:00"] = "12PM";
	labels["13:00"] = "1PM";
	labels["14:00"] = "2PM";
	labels["15:00"] = "3PM";
	labels["16:00"] = "4PM";
	labels["17:00"] = "5PM";
	labels["18:00"] = "6PM";
	labels["19:00"] = "7PM";
	labels["20:00"] = "8PM";
	labels["21:00"] = "9PM";
	labels["22:00"] = "10PM";
	labels["23:00"] = "11PM";
	if(typeof labels[time] == "undefined")
		return "N/A";
	return labels[time];
}

function Item(data){
	var self = this;
	self.name = "N/A";
	self.type = "";
	self.id = -1;
	self.facilityType = "";
	self.latitude = 0;//x axis
	self.longitude = 0;//y axis
	self.address = "";
	self.schedule= "";
	self.permitStatus = "N/A";
	self.slots = [];
	Item.prototype.init = function(data){
		var self = this;
		
		self.name = data["name"];
		self.type = data["type"];
		self.address = data["address"]
		self.latitude = data["latitude"];
		self.longitude = data["longitude"];
		self.id = data["id"];
		self.facilityType = data["facilityType"];
		self.schedule = data["schedule"];
		self.permitStatus = data["permitStatus"];
		self.slots = data["slots"]
	};
	
	Item.prototype.isValid = function(){
		var self = this;
		if(self.getName()==null || self.getAddress()==null || self.getType()==null || self.getLatitude()==null || self.getLongitude()==null)
			return false;
		return true;
	};
	
	Item.prototype.getPermitStatus = function(){
		var self = this;
		return self.permitStatus;
	};
	
	Item.prototype.getFacilityType = function(){
		var self = this;
		return self.facilityType;
	};
	
	Item.prototype.getSchedule = function(){
		var self = this;
		return self.schedule;
	};
	
	Item.prototype.getName = function(){
		var self = this;
		return self.name;
	};
	
	Item.prototype.getAddress = function(){
		var self = this;
		return self.address;
	};
	
	Item.prototype.getType = function(){
		var self = this;
		return self.type;
	};
	
	Item.prototype.getLatitude = function(){
		var self = this;
		return self.latitude;
	};
	
	Item.prototype.getLongitude = function(){
		var self = this;
		return self.longitude;
	};
	
	Item.prototype.getId = function(){
		var self = this;
		return self.id;
	};
	
	Item.prototype.distanceTo = function(c){
		var self = this;
		if(!self.isValid()) return -1;
		if(c==null) return -1;
		return kmToMiles(distance(parseFloat(self.longitude), parseFloat(self.latitude), parseFloat(c.B), parseFloat(c.k)));
	};
	
	Item.prototype.withinDates = function(start_date, start_time, end_date, end_time){
		var self = this;
		var current;
		var start = start_date +" "+ start_time;
		var end = end_date +" "+ end_time;
		//return true;
		for(var i=0;i<self.slots.length;i++){
			current = self.slots[i].day+" "+self.slots[i].time;
			if(current>=start && current <=end)
				return true;
		}
		return false;
	};
	
	Item.prototype.getValidDates = function(start_date, start_time, end_date, end_time){
		var self = this;
		var current, currentLabel;
		var start = start_date +" "+ start_time;
		var end = end_date +" "+ end_time;
		//return true;
		var valid_dates = [];
		for(var i=0;i<self.slots.length;i++){
			current = self.slots[i].day+" "+self.slots[i].time;
			currentLabel = getDayLabel(self.slots[i].day)+" "+getTimeLabel(self.slots[i].time);
			if(current>=start && current <=end)
				valid_dates.push(currentLabel);
		}
		return valid_dates;
	};
	this.init(data);
}

function GeoMap(dom, center, onInit){
	var self = this;
	self.map = null;//map object
	self.infowindow = null;//info window displayed when a row map link is clicked
	self.markersArray = [];//array of map markers when all geo locations are to be plotted
	self.geocoder = new google.maps.Geocoder();
	self.requested_center = center;//{k:37.7833,B:-122.4167}
	self.dom = dom;
	self.onInit = onInit;
	
	GeoMap.prototype.initialize = function() {//initialize map
		var self = this;
		var mapOptions = {
			  zoom: 12,
			  mapTypeId: google.maps.MapTypeId.ROADMAP
			};
		self.map = new google.maps.Map(self.dom, mapOptions);//display map in div id map_canvas
		self.showCoord(self.requested_center,"");//start location (sf, ca)
		
		if(typeof self.onInit == "function")
			self.onInit();
	};
	
	GeoMap.prototype.clearMap = function(){
		//remove all overlays and info windows from map
		var self = this;
		if(self.infowindow!=null)
			self.infowindow.close();
		self.clearOverlays();
	};

	GeoMap.prototype.clearOverlays = function() {
		// Removes the overlays from the map
		var self = this;
		if (self.markersArray) {
			for (i in self.markersArray) {
				google.maps.event.clearInstanceListeners(self.markersArray[i]);//clear marker listeners before removing them
				self.markersArray[i].setMap(null);
			}
		}
		self.markersArray = [];
	};

	GeoMap.prototype.showOverlays = function() {
		// Shows any overlays currently in the array
		var self = this;
		if(self.map){
			var bound = new google.maps.LatLngBounds();//get map bound object
			if (self.markersArray) {
				for (i in self.markersArray) {
					self.markersArray[i].setMap(self.map);
					bound.extend(self.markersArray[i].getPosition());//extend bounds to cover marker position
				}
				self.map.fitBounds(bound);//set map bounds to bound
			}
		}
	};
	
	GeoMap.prototype.showCoord = function(point,label, noClear){
		//show current coordinate on map along with label, display in info window
		var self = this;
		if(self.map){
			if(typeof noClear == "undefined")
				noClear = false;
			if(!noClear)
				self.clearMap();//clear map
			var pos = new google.maps.LatLng(point.k,point.B);//get coord position
			if(self.infowindow!=null)
				self.infowindow.close();
			self.infowindow = new google.maps.InfoWindow({//create info window at pos on map
					  map: self.map,
					  position: pos,
					  content: label
			});

			self.map.setCenter(pos);//center map at pos
		}
	};
	
	GeoMap.prototype.showAllItemsOnMap = function(requested_center, items, onItemClick){
		//show all current users on map
		var self = this;
		self.requested_center = requested_center;
		if(self.map){
			
			self.clearMap();//clear map of previous overlays and markers
			if(items.length==0){
				self.showCoord(requested_center,"");
			}else{
				for(var i=0;i<items.length;i++){//for each point
					//get coords and row id
					var lat = items[i].getLatitude();
					var lng = items[i].getLongitude();
					var rowid = items[i].getId();
					//console.log(lat+","+lng);
					if(lat==null || lng==null) continue;
					var myLatlng = new google.maps.LatLng(lat,lng);//get position
					var marker = new google.maps.Marker({//create marker for position
						position: myLatlng,
						title:""
					});
					//add click listener on marker to highlight its corresponding row in table
					(function(rowid) {
						google.maps.event.addListener(marker, 'click', function() {
							self.map.setZoom(16);
							self.map.setCenter(marker.getPosition());
							
							if(typeof onItemClick == "function")
								onItemClick(rowid);
						});
					})(rowid);
					self.markersArray.push(marker);//add marker to marker array
				}
				
				self.showOverlays();//display markers on map
			}
		}
	};	
	
	GeoMap.prototype.geocode = function(address, onSuccess, onError){
		var self = this;
		self.geocoder.geocode( { 'address': address}, function(results, status) {
			if (status == google.maps.GeocoderStatus.OK) {
				//In this case it creates a marker, but you can get the lat and lng from the location.LatLng
				self.map.setCenter(results[0].geometry.location);
				self.requested_center = results[0].geometry.location;
				
				if(typeof onSuccess == "function")
					onSuccess(self.requested_center);
				
			} else {
				if(typeof onError == "function")
					onError(status);
			}
		});
	};
	
	GeoMap.prototype.init = function(){
		var self = this;
		
		if (document.readyState === "complete") {
			self.initialize();
		}else{
			google.maps.event.addDomListener(window, 'load', 
				function(){	
					self.initialize();
				}
			);//initialize map
			
		}
	};
	self.init();
}

function Controller(){
	var self =  this;
	self.json_data = {}
	self.geomap = null;//map object
	self.json_url = "map.json";
	self.requested_center = {k:37.7833,B:-122.4167};
	self.types = {};
	self.items = [];
	self.items_key = {};
	self.xhr = null;
	self.msg_duration = 10000;//message display duration in ms
	self.error_timer = null;//error display timer
	self.start_date = "";
	self.start_time = "";
	self.end_date = "";
	self.end_time = "";
	Controller.prototype.showAllItemsOnMap = function(requested_center, items){
		var self = this;
		if(self.geomap){
			self.geomap.showAllItemsOnMap(requested_center, items, function(rowid){
				jQuery("tr>td").css({"background-color":"#ffffff"});//remove previous highlight
				//$("#row_"+rowid.toString()+" td").css({"background-color":"#C4EAF5"});//highlight row corresponding to clicked marker
				jQuery('html, body').animate({//scroll to row highlighted
				 scrollTop: jQuery("#item-"+rowid.toString()).offset().top
				 }, 500, function() {
				// Animation complete.
					jQuery("#item-"+rowid.toString()+">td").css({"background-color":"#C4EAF5"});//highlight row corresponding to clicked marker
					
					var $tr = jQuery("#item-"+rowid.toString());
					var point = {};
					point.k = parseFloat($tr.data("latitude"));
					point.B = parseFloat($tr.data("longitude"));
					var center = point;
					var name = $tr.find(".truck_name").text();
					var address = $tr.find(".truck_address").text();
					self.geomap.showCoord(center,name+"<br/>"+address, true);
				 });
			});
		}
		
		jQuery("a.truck_locator").off("click");
		if(items.length>0){
			var valid_dates, desc;
			var temp = "<table class='tablesorter'>";
			temp += "<thead>";
			temp += "<tr>";
			temp += "<th>Name</th>";	
			temp += "<th>Street</th>";
			temp += "<th>Type</th>";	
			temp += "<th>Description</th>";	
			temp += "<th>Time</th>";
			temp += "</tr>";
			temp += "</thead>";
			temp += "<tbody>";
			for(var i=0;i<items.length;i++){//for each point
				desc = items[i].getType().substring(0,20);
				if(items[i].getType().length>20)
					desc += "...";
				valid_dates = items[i].getValidDates(self.start_date, self.start_time, self.end_date, self.end_time);
				temp += "<tr id='item-"+items[i].getId().toString()+"' data-latitude='"+items[i].getLatitude()+"' data-longitude='"+items[i].getLongitude()+"'>";
				temp += "<td class='truck_name'><a href='#' class='truck_locator'>"+items[i].getName()+"</a></td>";
				temp += "<td class='truck_address'>"+items[i].getAddress()+"</td>";
				temp += "<td class='truck_facilityType'>"+items[i].getFacilityType()+"</td>";
				temp += "<td class='truck_type' title='"+desc+"'>"+desc+"</td>";
				temp += "<td class='truck_time'>";
				temp +=  valid_dates.join("<br/>");
				temp += "</td>";
				temp += "</tr>";
			}
			temp += "</tbody>";
			temp += "</table>";
			jQuery("#results").html(temp);
		
			jQuery("#results>table").tablesorter( {sortList: [[0,0]]} ); 
		}else{
			jQuery("#results").html("No data available!");
		}
		
		jQuery("a.truck_locator").on("click",function(e){
			var point = {};
			var $tr = jQuery(this).closest("tr");
			point.k = parseFloat($tr.data("latitude"));
			point.B = parseFloat($tr.data("longitude"));
			var center = point;
			var address = $tr.find(".truck_address").text();
			jQuery("tr>td").css({"background-color":"#ffffff"});//remove previous highlight
			self.geomap.showCoord(center,jQuery(this).text()+"<br/>"+address, true);
			jQuery('html, body').animate({//scroll to row highlighted
				scrollTop: jQuery(self.geomap.dom).offset().top
			 }, 1000, function() {
			// Animation complete.
				
			 });
			$tr.find("td").css({"background-color":"#C4EAF5"});//highlight row corresponding to clicked marker
			e.preventDefault();
			return false;
		});
	};
	
	Controller.prototype.load_data = function(){
		var self = this;
		
		jQuery("#loading1").show();
		jQuery("#filter input,#filter select").attr("disabled","disabled");
		self.xhr =jQuery.ajax({//load backend data, on load build data and render chart
			type:"GET",
			data:{},
			url:self.json_url,
			context:this,
			dataType: 'json',
			success:function(data,status){
				jQuery("#filter input,#filter select").removeAttr("disabled");
				self.json_data = data;
				self.init_form(self.json_data);
				
			},
			complete:function(jqXHR, textStatus){
				jQuery("#loading1").hide();
			},
			error: function (data, status, e){//on data loading error, display error message
				jQuery("#message").html("Unable to connect to server!");
			}
		});
	};
	
	Controller.prototype.parse_json = function(requested_center, json_data, radius, start_date, start_time, end_date, end_time){
		var self = this;
		//var data = json_data.data;
		var data = json_data;
		self.items = [];
		self.types = {};
		self.items_key = {};
		self.requested_center = requested_center;
		self.start_date = start_date;
		self.start_time = start_time;
		self.end_date = end_date;
		self.end_time = end_time;
		//console.log(data);
		//for(var i=0;i<data.length;i++){
		//	item = new Item(data[i]);
		for(var key in data){
			item = new Item(data[key]);
			if(item.isValid() && item.distanceTo(requested_center)<=radius && (typeof self.items_key[item.getName()+"_"+item.getAddress()] == "undefined")
				&& item.withinDates(start_date, start_time, end_date, end_time)){
				self.items_key[item.getName()+"_"+item.getAddress()] = true;
				self.items.push(item);
			}
		}
		var type;
		self.types["*"] = new Array();
		for(i=0;i<self.items.length;i++){
			type = self.items[i].getType();
			type = type.replace(/(['"])/g, "");
			if(type==null) continue;
			if(typeof self.types[type] == "undefined"){
				self.types[type]  = new Array();
			}
			self.types[type].push(i);
			self.types["*"].push(i);//all types
		}
		
		self.showTypes(self.types);
		
		jQuery("#foodType").trigger("change");
	};

	Controller.prototype.showTypes = function(types){
		var self = this;
		var temp = "";
		var keys = [];
		for(var key in types){
			keys.push(key);
		}
		keys.sort();
		var current_selected = jQuery("#foodType").val();
		temp += "<option value='none' selected>Select Food Truck Type</option>";
		for(var i=0;i<keys.length;i++){
			key = keys[i];
			var typeLabel = key.substring(0,50);
			if(key.length>50)
				typeLabel += "...";
			if(key=="*")
				typeLabel = "All Food Trucks";
			temp += "<option value='"+key+"' title='"+key+"'>"+typeLabel+"("+(types[key].length).toString()+")"+"</option>";
		}
		jQuery("#foodType").html(temp);
		jQuery("#foodType").val(current_selected);
	};
	
	Controller.prototype.displayError = function(msg){
		//display timed error
		var self = this;
		if(self.error_timer!=null)
			clearTimeout(self.error_timer);//clear previous timer
		jQuery("#error").html(msg).show();//display message
		self.error_timer = setTimeout(function(){jQuery("#error").html("").hide();},self.msg_duration);//run timer so message is cleared at end
		
	};
	
	Controller.prototype.validateForm = function(){
		var self = this;
		//clear error, reset timeer
		clearTimeout(self.error_timer);//clear previous timeer
		jQuery("#error").html("").hide();//display message
		var start = jQuery("#start_date").val()+" "+jQuery("#start_time").val();
		var end = jQuery("#end_date").val()+" "+ jQuery("#end_time").val();
		if(start >end){
			self.displayError("Invalid date range, start datetime should be less than end datetime!");
			jQuery("#start_date").focus();
			return false;
		}
		return true;
	};
	
	Controller.prototype.init_form = function(json_data){
		var self = this;
		self.parse_json(self.requested_center, json_data, jQuery("#distance").val(), jQuery("#start_date").val(), jQuery("#start_time").val(), jQuery("#end_date").val(), jQuery("#end_time").val());
	
		jQuery("#filter").on("submit",function(e){
			var address = jQuery("#address").val();
			
			if(self.validateForm()){
				self.geomap.geocode(address, 
					function(requested_center){
						self.parse_json(requested_center, json_data, jQuery("#distance").val(), jQuery("#start_date").val(), jQuery("#start_time").val(), jQuery("#end_date").val(), jQuery("#end_time").val());
					},
					function(status){
						alert("Geocode was not successful for the following reason: " + status);
					}
				);
			}
			e.preventDefault();
			return false;
		});
		
		jQuery("#foodType").on("change", function(e){
			var type = jQuery(this).val();
			var filtered_items = [];
			if(typeof self.types[type] == "undefined"){
				self.showAllItemsOnMap(self.requested_center, filtered_items);
				return;
			}
			
			for(var i=0;i<self.types[type].length;i++){
				filtered_items.push(self.items[self.types[type][i]]);
			}
			
			self.showAllItemsOnMap(self.requested_center, filtered_items);
		});
		
		jQuery("#distance").on("change", function(e){
			self.parse_json(self.requested_center, self.json_data, jQuery(this).val(), jQuery("#start_date").val(), jQuery("#start_time").val(), jQuery("#end_date").val(), jQuery("#end_time").val());
		});
		
		self.initDateRange();
		jQuery("#filter").submit();
	};
	
	Controller.prototype.initDateRange = function(){
		var self  = this;
		var now, day, hour, time, next;
		now = new Date();
		day = now.getDay();
		hour = now.getHours(); 
		time = "00:00";
		if(hour<10)
			time = "0"+hour.toString()+":00";
		else
			time = hour.toString()+":00";
		jQuery("#start_date").val(day);
		jQuery("#start_time").val(time);
		
		next = new Date(new Date().getTime() + 2 * 60 * 60 * 1000);//2 hours from now
		day = next.getDay();
		hour = next.getHours(); 
		time = "00:00";
		if(hour<10)
			time = "0"+hour.toString()+":00";
		else
			time = hour.toString()+":00";
		jQuery("#end_date").val(day);
		jQuery("#end_time").val(time);
	};
	
	Controller.prototype.init = function(){
		var self = this;
		jQuery("#address").val("San Francisco, CA");//default location
		//on document ready, initialize google map, 
		if (navigator.geolocation) {
			var timeoutVal = 10 * 1000; //10 seconds
			navigator.geolocation.getCurrentPosition(
				function(position){//success
					self.requested_center = {k:position.coords.latitude,B:position.coords.longitude};
					jQuery("#address").val(position.coords.latitude+","+position.coords.longitude);
					self.initLocation();
				},
				function(){//failure
					self.displayError("Unable to determine your geolocation!");
				},
				{ enableHighAccuracy: true, timeout: timeoutVal, maximumAge: 0 }
			);
		}
		self.initLocation();
	};
	
	Controller.prototype.initLocation = function(){
		var self = this;
		self.geomap = new GeoMap(document.getElementById("map_canvas"), self.requested_center, 
			function(){
				self.load_data();
			}
		);
	};
}

//////////////////////////////////////////////////////////////////////////
var controller = new Controller();
$(document).ready(function() {//on document ready, initialize map, show all items on map click event
	controller.init();
});
