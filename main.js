//https://data.sfgov.org/Economy-and-Community/Mobile-Food-Facility-Permit/rqzj-sfat?

/** Converts numeric degrees to radians */
if (typeof(Number.prototype.toRad) === "undefined") {
  Number.prototype.toRad = function() {
    return this * Math.PI / 180;
  }
}
function distance(lon1, lat1, lon2, lat2) {
	//returns the distance in km between 2 map coordinates 
	//point 1: latitude (lat1), longitude (lon1)
	//point 2: latitude (lat2), longitude (lon2)
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
	//converts from km to miles
	return km * 0.62137;
}

function getDayLabel(day){
	//returns the 3 character day label corresponding the day index
	var labels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
	day = parseInt(day,10);
	if(typeof labels[day] == "undefined")
		return "N/A";
	return labels[day];
}

function getTimeLabel(time){
	//returns the display label corresponding to the YY:MM format time string provided
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
	//Food truck object, holds all the truck information and location 
	//as well as schedule and all other related functions
	//takes in the json data object and parses it to initialize object
	var self = this;
	self.name = "N/A";//truck company name
	self.type = "";//truck food type
	self.id = -1;//truck id
	self.facilityType = "";//truck facility type
	self.latitude = 0;//location latitude
	self.longitude = 0;//location longitude
	self.address = "";//stree address
	self.schedule= "";//schedule url
	self.permitStatus = "N/A";//truck permit status
	self.slots = [];//schedule slots (array of day/time)
	
	Item.prototype.init = function(data){
		//constructor, initialize truck data (using json data)
		var self = this;
		self.name = data["name"];//set name
		self.type = data["type"];//set type
		self.address = data["address"];//set street address
		self.latitude = data["latitude"];//set latitude
		self.longitude = data["longitude"];//set longitude
		self.id = data["id"];//set id
		self.facilityType = data["facilityType"];//set facility type
		self.schedule = data["schedule"];//set schedule url
		self.permitStatus = data["permitStatus"];//set permit status
		self.slots = data["slots"];//set time slots
	};
	
	Item.prototype.isValid = function(){
		//returns true if item is valid, false otherwise
		var self = this;
		if(self.getName()==null || self.getAddress()==null || self.getType()==null || self.getLatitude()==null || self.getLongitude()==null)
			return false;
		return true;
	};
	
	Item.prototype.getPermitStatus = function(){
		//return permit status
		var self = this;
		return self.permitStatus;
	};
	
	Item.prototype.getFacilityType = function(){
		//returns facility type
		var self = this;
		return self.facilityType;
	};
	
	Item.prototype.getSchedule = function(){
		//returns schedule url
		var self = this;
		return self.schedule;
	};
	
	Item.prototype.getName = function(){
		//returns truck name
		var self = this;
		return self.name;
	};
	
	Item.prototype.getAddress = function(){
		//returns street address
		var self = this;
		return self.address;
	};
	
	Item.prototype.getType = function(){
		//returns type of food
		var self = this;
		return self.type;
	};
	
	Item.prototype.getLatitude = function(){
		//returns truck latitude
		var self = this;
		return self.latitude;
	};
	
	Item.prototype.getLongitude = function(){
		//returns truck longitude
		var self = this;
		return self.longitude;
	};
	
	Item.prototype.getId = function(){
		//returns truck id
		var self = this;
		return self.id;
	};
	
	Item.prototype.distanceTo = function(c){
		//returns the map distance in miles between current Item object and c Item
		var self = this;
		if(!self.isValid()) return -1;
		if(c==null) return -1;
		return kmToMiles(distance(parseFloat(self.longitude), parseFloat(self.latitude), parseFloat(c.B), parseFloat(c.k)));
	};
	
	Item.prototype.withinDates = function(start_date, start_time, end_date, end_time){
		//returns true if the current item has a time slot with the data range provided (inclusive), false otherwise
		var self = this;
		var current;
		var start = start_date +" "+ start_time;//get start date time
		var end = end_date +" "+ end_time;//get end date time
		
		for(var i=0;i<self.slots.length;i++){//for each item time slot
			current = self.slots[i].day+" "+self.slots[i].time;//get time slot datetime
			if(start<=end){//start less than end
				if(current>=start && current <=end){ //if within range, return true
					return true;
				}
			}else{//end less than start
				if(current>=start || current <=end){//current date greater than start or less than end
					return true;
				}
			}
		}
		
		return false;//not within range, return false
	};
	
	Item.prototype.getValidDates = function(start_date, start_time, end_date, end_time, useLabels){
		//get array of all valid dates within range specified, return them as labels if useLabels, or as day/time objects otherwise
		var self = this;
		var current, currentLabel;
		var start = start_date +" "+ start_time;
		var end = end_date +" "+ end_time;
		if(typeof useLabels == "undefined"){//default, use string labels instead of day/time objects
			useLabels = true;
		}
		//return true;
		var valid_dates = [];//array of valid dates to be returned
		for(var i=0;i<self.slots.length;i++){//for each time slot
			current = self.slots[i].day+" "+self.slots[i].time;
			if(start<=end){//start less than end
				if(current>=start && current <=end){//if within date range (inclusive)
					if(useLabels){//use labels
						currentLabel = getDayLabel(self.slots[i].day)+" "+getTimeLabel(self.slots[i].time);//get label
						valid_dates.push(currentLabel);//push to valid dates
					}else{//return objects
						valid_dates.push(self.slots[i]);
					}
				}
			}else{//end less than start
				if(current>=start || current <=end){//current date greater than start or less than end
					if(useLabels){//use labels
						currentLabel = getDayLabel(self.slots[i].day)+" "+getTimeLabel(self.slots[i].time);//get label
						valid_dates.push(currentLabel);//push to valid dates
					}else{//return objects
						valid_dates.push(self.slots[i]);
					}
				}
			}
		}
		return valid_dates;//return valid dates
	};
	this.init(data);//initialize data
}

function GeoMap(dom, center, onInit){
	//map class, takes in the dom object where the map would be loaded, the initial map center coordinates 
	//and the function onInit to run when the map is loaded
	//centers map at any location, looks up addresses and centers map at it,
	//display overlay info windows at any location, display markers on map and add custom click listeners on marker clicks
	var self = this;
	self.map = null;//map object
	self.infowindow = null;//info window displayed at a map location
	self.markersArray = [];//array of map markers when all geo locations are to be plotted
	self.geocoder = new google.maps.Geocoder();//map geocoder, use to find geolocation of addresses
	self.requested_center = center;//{k:37.7833,B:-122.4167}
	self.dom = dom;//dom object where map is to be loaded
	self.onInit = onInit;//on map load function
	
	GeoMap.prototype.initialize = function() {
		//initialize map and run onInit function, center map at specified center
		var self = this;
		var mapOptions = {
			  zoom: 12,
			  mapTypeId: google.maps.MapTypeId.ROADMAP
			};//map options
		self.map = new google.maps.Map(self.dom, mapOptions);//load map in dom using map options
		self.showCoord(self.requested_center,"");//center map at specified location, no label
		
		if(typeof self.onInit == "function"){//run on init function
			self.onInit();
		}
	};
	
	GeoMap.prototype.clearMap = function(){
		//remove all overlays and info windows from map
		var self = this;
		if(self.map){//map already exists
			if(self.infowindow!=null)
				self.infowindow.close();//close info window
			self.clearOverlays();//clear all map overlays
		}
	};

	GeoMap.prototype.clearOverlays = function() {
		// Removes the overlays from the map
		var self = this;
		if(self.map){//map already exists
			if (self.markersArray) {
				for (i in self.markersArray) {//for each marker
					google.maps.event.clearInstanceListeners(self.markersArray[i]);//clear marker listeners before removing them
					self.markersArray[i].setMap(null);
				}
			}
			self.markersArray = [];//clear overlay array
		}
	};

	GeoMap.prototype.showOverlays = function() {
		// Shows any overlays (red markers) currently in the markersArray on the map
		var self = this;
		if(self.map){//map already exists
			var bound = new google.maps.LatLngBounds();//get map bound object
			if (self.markersArray) {
				for (i in self.markersArray) {//for each marker
					self.markersArray[i].setMap(self.map);//add marker to map
					bound.extend(self.markersArray[i].getPosition());//extend bounds to cover marker position
				}
				self.map.fitBounds(bound);//set map bounds to bound (so markers show)
			}
		}
	};
	
	GeoMap.prototype.showCoord = function(point,label, noClear){
		//show info window at point coordinate object on map along using optional label, display label (if not empty) in info window
		//if noClear is true, map markers and other objects are not cleared, otherwise they are cleared
		var self = this;
		if(self.map){//map already exists
			if(typeof noClear == "undefined")
				noClear = false;//default is to clear map
			if(!noClear){
				self.clearMap();//clear map
			}
			var pos = new google.maps.LatLng(point.k,point.B);//get coord position
			if(self.infowindow!=null)
				self.infowindow.close();//close any open info window
			if(label!=""){//do not display info window if blank label
				self.infowindow = new google.maps.InfoWindow({//create info window at pos on map (will not show if blank)
						  map: self.map,
						  position: pos,
						  content: label
				});
			}
			self.map.setCenter(pos);//center map at requested pos
		}
	};
	
	GeoMap.prototype.showAllItemsOnMap = function(requested_center, items, onItemClick){
		//center map at requested center
		//show all items on map in their corresponding locations, 
		//add onItemClick function listener when marker at an item is clicked
		var self = this;
		self.requested_center = requested_center;//update map center
		if(self.map){//map already exists
			
			self.clearMap();//clear map of previous overlays and markers
			if(items.length==0){//if no items, just center map without displaying markers of any items
				self.showCoord(requested_center,"");
			}else{
				for(var i=0;i<items.length;i++){//for each item
					//get coords and row id
					var lat = items[i].getLatitude();//get item latitude
					var lng = items[i].getLongitude();//get item longitude
					var rowid = items[i].getId();//get item id
					
					if(lat==null || lng==null) continue; //skip if invalid coordinates
					var myLatlng = new google.maps.LatLng(lat,lng);//get position for item latitude/longitude
					var marker = new google.maps.Marker({//create marker for position
						position: myLatlng,
						title:""
					});
					//add click listener on marker to highlight its corresponding row in table
					(function(rowid) {
						google.maps.event.addListener(marker, 'click', function() {//for each marker click
							self.map.setZoom(16);//on marker click, zoom in
							self.map.setCenter(marker.getPosition());//center map at clicked marker position
							
							if(typeof onItemClick == "function"){//if click handler specified
								onItemClick(rowid);//run custom click handler, pass item id to it
							}
						});
					})(rowid);
					self.markersArray.push(marker);//add marker to marker array
				}
				
				self.showOverlays();//display markers on map (now that markers are in markersArray)
			}
		}
	};	
	
	GeoMap.prototype.geocode = function(address, onSuccess, onError){
		//get the geolocation of address specified and center map at it, on success run onSuccess function, on error run onError function
		var self = this;
		self.geocoder.geocode( { 'address': address}, function(results, status) {//get geolocation of address 
			if (status == google.maps.GeocoderStatus.OK) {//if found, run success handler
				//In this case it creates a marker, but you can get the lat and lng from the location.LatLng
				if(self.map){//map already exists
					self.map.setCenter(results[0].geometry.location);//set map location to determined geolocation
				}
				self.requested_center = results[0].geometry.location;//updated requested center
				
				if(typeof onSuccess == "function"){//on success, run on success function, pass found geolocation
					onSuccess(self.requested_center);
				}
			} else {//not found, run error handler
				if(typeof onError == "function"){
					onError(status);
				}
			}
		});
	};
	
	GeoMap.prototype.init = function(){
		//initialize map when document is ready
		var self = this;
		
		if (document.readyState === "complete") {//if document already loaded, initialize directly
			self.initialize();
		}else{//wait for window to finish load and the initialize map
			google.maps.event.addDomListener(window, 'load', 
				function(){	
					self.initialize();
				}
			);//initialize map
			
		}
	};
	self.init();//initialize map
}

function Controller(){
	//controller builds entire application, loads map, loads truck data, populates form, and displays filtered results in table as well as map
	//allows all interaction (initializes event listeners to form submit, select field change, results click, map item clicks, etc...)
	var self =  this;
	self.json_data = {}; //truck json data loaded from server
	self.geomap = null;//map object
	self.json_url = "map.json";//url for jason data
	self.requested_center = {k:37.7833,B:-122.4167};//default requested center (SF)
	self.types = {};//dictionary of type to array of item indexes
	self.items = [];//array of food truck items
	self.items_key = {};//keeps track of unique trucks, using truck id/address key, prevents duplicates
	self.xhr = null;//XMLHttpRequest object (used to load json data)
	self.msg_duration = 10000;//message display duration in ms
	self.error_timer = null;//error display timer
	self.start_date = "";//current start day (for filtered items)
	self.start_time = "";//current start time (for filtered items)
	self.end_date = "";//current end day (for filtered items)
	self.end_time = "";//current end time (for filtered items)
	
	Controller.prototype.load_data = function(){
		//run on map load, loads food truck data json file, on load, enable form, initialize form and display data selected
		var self = this;
		
		jQuery("#loading1").show();//show loading image
		jQuery("#filter input,#filter select").attr("disabled","disabled");//disable form fields
		self.xhr =jQuery.ajax({//load backend data, on load build data and render chart
			type:"GET",
			data:{},
			url:self.json_url,
			context:this,
			dataType: 'json',
			success:function(data,status){//load truck data
				jQuery("#filter input,#filter select").removeAttr("disabled");//enable form fields
				self.json_data = data;//save json data
				self.init_form(self.json_data);//initialize form with data and update map too with selected data
				
			},
			complete:function(jqXHR, textStatus){
				jQuery("#loading1").hide();//hide loading image
			},
			error: function (data, status, e){//on data loading error, display error message
				self.displayError("Unable to connect to server!");
			}
		});
	};
	
	Controller.prototype.showAllItemsOnMap = function(requested_center, items){
		//show filtered items list in html table and on map (as markers) centered at requested_center
		//add event listeners to map marker click and table truck clicks
		var self = this;
		if(self.geomap){//if map object ready
			self.geomap.showAllItemsOnMap(
				requested_center, //center map at requested_center
				items, //array of items to be displayed
				function(rowid){//item click handler, receives item id to find in table
					jQuery("tr>td").css({"background-color":"#ffffff"});//remove previous highlighted rows
					jQuery('html, body').animate({//scroll to top of row corresponding to marker clicked
						scrollTop: jQuery("#item-"+rowid.toString()).offset().top 
					 }, 500, function() {
						// Animation complete.
						jQuery("#item-"+rowid.toString()+">td").css({"background-color":"#C4EAF5"});//highlight row corresponding to clicked marker
						
						var $tr = jQuery("#item-"+rowid.toString());//get containing row
						var point = {};//location point corresponding to clicked marker
						point.k = parseFloat($tr.data("latitude"));//get truck latitude
						point.B = parseFloat($tr.data("longitude"));//get truck longitude
						var center = point;
						var name = $tr.find(".truck_locator").text();//get truck name
						var address = $tr.find(".truck_address").text();//get truck street address
						self.geomap.showCoord(center,name+"<br/>"+address, true);//display info window on map at clicked marker
					 });
				}
			);
		}
		
		jQuery("a.truck_locator").off("click");//remove previous table truck name click listener
		//display results table
		if(items.length>0){//if data available
			var valid_dates, desc;
			//build table header with fields (name, stree, truck type, food type, availability time)
			var temp = "<table class='tablesorter'>";
			temp += "<thead>";
			temp += "<tr>";
			temp += "<th>Name/Address/Time</th>";	
			temp += "<th>Description</th>";	
			temp += "</tr>";
			temp += "</thead>";
			temp += "<tbody>";
			//build table body
			for(var i=0;i<items.length;i++){//for each truck item
				//get description of food (max 100 characters)
				desc = items[i].getType().substring(0,100);
				if(items[i].getType().length>100)
					desc += "...";
				//get all valid date labels within current range
				valid_dates = items[i].getValidDates(self.start_date, self.start_time, self.end_date, self.end_time);
				//container row holds latitude and longitude coordinates of current truck as well as item id
				temp += "<tr id='item-"+items[i].getId().toString()+"' data-latitude='"+items[i].getLatitude()+"' data-longitude='"+items[i].getLongitude()+"'>";
				temp += "<td class='truck_name' title='"+items[i].getName().replace(/(['"])/g, "")+"'><a href='#' class='truck_locator'>";
				//show name
				temp += items[i].getName();
				temp += "</a>";
				temp += "<span class='truck_facilityType'>&nbsp;("+items[i].getFacilityType()+")</span>";//truck type
				temp += "<div class='truck_address'>"+items[i].getAddress()+"</div>";//truck street address
				temp += "<div class='truck_time'>";
				temp +=  valid_dates.join(", ");//display all valid dates, one per line
				temp += "</div>";
				temp += "</td>";//truck company name, on click will display location on map
				temp += "<td class='truck_type' title='"+desc+"'>"+desc+"</td>";//display truck food type
				temp += "</tr>";
			}
			temp += "</tbody>";
			temp += "</table>";
			jQuery("#results").html(temp);//display updated table
		
			jQuery("#results>table").tablesorter( {sortList: [[0,0]]} ); //make table sortable
		}else{
			jQuery("#results").html("No data available!");//no data available
		}
		
		jQuery("a.truck_locator").on("click",function(e){//table truck name click listener
			var point = {};//point corresponding to truck location
			var $tr = jQuery(this).closest("tr");//get container row
			point.k = parseFloat($tr.data("latitude"));//get truck's latitude from container row
			point.B = parseFloat($tr.data("longitude"));//get truck's longitude from container row
			var center = point;
			var address = $tr.find(".truck_address").text();//get clicked truck street address
			jQuery("tr>td").css({"background-color":"#ffffff"});//remove previous highlighted rows
			self.geomap.showCoord(center,jQuery(this).text()+"<br/>"+address, true);//show overlay for clicked truck on map with its name and address
			jQuery('html, body').animate({//scroll to top of map
				scrollTop: jQuery(self.geomap.dom).offset().top
			 }, 1000, function() {
			// Animation complete.
				
			 });
			$tr.find("td").css({"background-color":"#C4EAF5"});//highlight row corresponding to clicked truck name
			e.preventDefault();//prevent default click behavior
			return false;
		});
	};
	
	Controller.prototype.parse_json = function(requested_center, json_data, radius, start_date, start_time, end_date, end_time){
		//takes in map center, json truck data, distance and range and updates matching items for requested criteria
		//updates list of types and refreshes map and table results
		var self = this;
		var type;
		var data = json_data;//json data
		self.items = [];//reset items list
		self.types = {};//reset types list
		self.items_key = {};//reset items unique identifiers
		self.requested_center = requested_center;//update current map center
		self.start_date = start_date;//update start date
		self.start_time = start_time;//update start time
		self.end_date = end_date;//update end date
		self.end_time = end_time;//update end time
		
		for(var key in data){//for each item
			item = new Item(data[key]);//create item object using json data
			//check item is valid, within distance, within range and not already added
			if(item.isValid() && item.distanceTo(requested_center)<=radius && (typeof self.items_key[item.getName()+"_"+item.getAddress()] == "undefined")
				&& item.withinDates(start_date, start_time, end_date, end_time)){
				self.items_key[item.getName()+"_"+item.getAddress()] = true;//keep track of name/address of items to prevent duplicates
				self.items.push(item);//save item in items list
			}
		}
		
		self.types["*"] = new Array();//add * type which shows all food trucks within range
		for(i=0;i<self.items.length;i++){//for all items
			type = self.items[i].getType();//get item type
			if(type==null) continue; //invalid type, skip
			type = type.replace(/(['"])/g, "");//remove single and double quotes
			if(typeof self.types[type] == "undefined"){//if new type, initialize
				self.types[type]  = new Array();
			}
			self.types[type].push(i);//push current item to items corresponding to type
			self.types["*"].push(i);//for all types, push current item
		}
		
		self.showTypes(self.types);//update form types with current available types
		
		jQuery("#foodType").trigger("change");//trigger type change to force results update
	};

	Controller.prototype.showTypes = function(types){
		//get dictionary of types (key id food type, value is an array of indexes in items array for items matching current type)
		//populates it in food type select field, and keeps default selected field
		var self = this;
		var temp = "";
		var keys = [];//array of keys
		for(var key in types){//for each type
			keys.push(key);//save all types
		}
		keys.sort();//sort type keys
		var current_selected = jQuery("#foodType").val();//get current selected type before updating list
		//build updated list content
		temp += "<option value='none' selected>Select Food Truck Type</option>";//none option
		for(var i=0;i<keys.length;i++){//for each type option
			key = keys[i];//get key
			//show up to 30 characters
			var typeLabel = key.substring(0,30);
			if(key.length>30)
				typeLabel += "...";
			if(key=="*") //if show all option (*)
				typeLabel = "All Food Trucks";//show all label
			temp += "<option value='"+key+"' title='"+key+"'>"+typeLabel+"("+(types[key].length).toString()+")"+"</option>";//add current type option
		}
		jQuery("#foodType").html(temp);//populate options
		jQuery("#foodType").val(current_selected);//reselect default option if found
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
		//validate form, currently only checks date range is valid, return false otherwise
		var self = this;
		//clear error, reset timer
		clearTimeout(self.error_timer);//clear previous timeer
		jQuery("#error").html("").hide();//hide error message
		var start = jQuery("#start_date").val()+" "+jQuery("#start_time").val();//start date string (allows string comparison)
		var end = jQuery("#end_date").val()+" "+ jQuery("#end_time").val();//end date string(allows string comparison)
		if(start >end && (jQuery("#start_date").val() == jQuery("#end_date").val())){//invalid range (same day but start time greater than end time), return false and display error message
			self.displayError("Invalid date range, start datetime should be less than end datetime!");
			jQuery("#start_date").focus();
			return false;
		}
		return true;//valid form
	};
	
	Controller.prototype.init_form = function(json_data){
		//run on json data load
		//initialize form with json data, parse json data and filter items according to distance and date range
		//initializes form submit handler
		//food type change handler
		//distance change handler
		//initializes default current date range
		//refreshes form results
		var self = this;
		//filter items using distance from center and date range, populates data types
		self.parse_json(self.requested_center, json_data, jQuery("#distance").val(), jQuery("#start_date").val(), jQuery("#start_time").val(), jQuery("#end_date").val(), jQuery("#end_time").val());
	
		jQuery("#filter").off("submit");//remove previous submit listeners
		jQuery("#filter").on("submit",function(e){//on form submit, get address, update map and results
			var address = jQuery("#address").val();//get address
			var distance = jQuery("#distance").val();//get distance
			var start_day = jQuery("#start_date").val();//get start day of week
			var start_time = jQuery("#start_time").val();//get start time of day
			var end_day = jQuery("#end_date").val();//get end day of week
			var end_time = jQuery("#end_time").val();//get end time of day
			if(self.validateForm()){//validate form
				//update map to reflect selected addresses, on success, filter results using new location with form criteria
				self.geomap.geocode(address, 
					function(requested_center){//using new center, re-filter and update results
						self.parse_json(requested_center, json_data, distance, start_day, start_time, end_day, end_time);
					},
					function(status){//if error resolving address, display error message
						self.displayError("Geocode was not successful for the following reason: " + status);
					}
				);
			}
			e.preventDefault();//prevent submission
			return false;
		});
		
		jQuery("#foodType").off("change");//remove previous foot type change listeners
		jQuery("#foodType").on("change", function(e){//on food type change, update results
			//get requested type
			var type = jQuery(this).val();
			var filtered_items = [];
			if(typeof self.types[type] == "undefined"){//if type not found, clear map
				self.showAllItemsOnMap(self.requested_center, filtered_items);
				return;
			}
			
			for(var i=0;i<self.types[type].length;i++){//update filtered items with all items corresponding to indexes corresponding to type
				filtered_items.push(self.items[self.types[type][i]]);
			}
			
			self.showAllItemsOnMap(self.requested_center, filtered_items);//update map
		});
		
		jQuery("#distance").off("change");//remove previous distance change listeners
		jQuery("#distance").on("change", function(e){//on distance change
			//filter data and update results table and map markers to reflect changes
			self.parse_json(self.requested_center, self.json_data, jQuery(this).val(), jQuery("#start_date").val(), jQuery("#start_time").val(), jQuery("#end_date").val(), jQuery("#end_time").val());
		});
		
		self.initDateRange();//initialize to default range
		jQuery("#filter").submit();//submit form to update results based on current criteria
	};
	
	Controller.prototype.initDateRange = function(){
		//initialize data range, set start to current hour, end to next hour of current day
		var self  = this;
		var now, day, hour, time, next;
		now = new Date();//current time
		day = now.getDay();//get day of week
		hour = now.getHours(); //get hour of day
		time = "00:00";
		//time format, use 2 digits for hour
		if(hour<10)
			time = "0"+hour.toString()+":00";
		else
			time = hour.toString()+":00";
		jQuery("#start_date").val(day);//set start day
		jQuery("#start_time").val(time);//set start time
		
		next = new Date(new Date().getTime() + 1 * 60 * 60 * 1000);//1 hour from now
		day = next.getDay();//get day of week
		hour = next.getHours(); //get hour of day
		time = "00:00";
		//time format, use 2 digits for hour
		if(hour<10)
			time = "0"+hour.toString()+":00";
		else
			time = hour.toString()+":00";
		jQuery("#end_date").val(day);//set end day
		jQuery("#end_time").val(time);//set end time
	};
	
	Controller.prototype.init = function(){
		//initialize map and load map data, try to use user's geolocation if available, otherwise use default
		var self = this;
		jQuery("#address").val("San Francisco, CA");//default location
		//on document ready, initialize google map, 
		if (navigator.geolocation) {//if geolocaiton api available
			var timeoutVal = 10 * 1000; //10 seconds timeout
			navigator.geolocation.getCurrentPosition(
				function(position){//success, location found
					self.requested_center = {k:position.coords.latitude,B:position.coords.longitude};//update map center to user's locaiton
					jQuery("#address").val(position.coords.latitude+","+position.coords.longitude);//update address field
					self.initLocation();//initialize map with user's location
				},
				function(){//failure to find geolocation
					self.displayError("Unable to determine your geolocation!");
				},
				{ enableHighAccuracy: true, timeout: timeoutVal, maximumAge: 0 }
			);
		}
		self.initLocation();//initialize map
	};
	
	Controller.prototype.initLocation = function(){
		//initialize map at requested location and then load truck data to populate map and form
		var self = this;
		//initialize map in div of id map_canvas, at requested center
		self.geomap = new GeoMap(document.getElementById("map_canvas"), self.requested_center, 
			function(){//on map initialization, load truck data
				self.load_data();
			}
		);
	};
}

//////////////////////////////////////////////////////////////////////////
var controller = new Controller();//create application controller
jQuery(document).ready(function() {//on document ready, initialize map, show all items on map click event
	controller.init();//initialize application
});
