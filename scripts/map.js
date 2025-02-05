const TIMEOUT = 5 * 1000 * 3600;

//Default location
x = 46.051;
y = 14.505;
var m2 = {};
var m3 = {};
timers = [];
lastZoom = undefined;
let currentPolyline = null;
let currentStopsLayer = null;
var nextStopData = null;
var busData = {};


//Theme settings
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    // dark mode
    busIconSrc = "graphics/bus_dark.svg";
    busDirectionSrc = "graphics/bus_arrow_dark.svg";
    mapStyle = "streets-v2-dark";
    document.querySelector('meta[name="theme-color"]').setAttribute('content', '#213545');
} else {
    busIconSrc = "graphics/bus.svg";
    busDirectionSrc = "graphics/bus_arrow.svg";
    mapStyle = "streets";
}

// BEGIN LEAFLET MAP
var busIcon = L.icon({

    iconUrl: busIconSrc,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
});

var myIconlocation = L.icon({
    iconUrl: 'graphics/location_accent-01.svg',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [-3, -76]
});

var busDirection = L.icon({
    iconUrl: busDirectionSrc,
    iconSize: [45, 45],
    iconAnchor: [22.5, 22.5],
    popupAnchor: [0, -14]
});

var peronIcon = L.icon({
    iconUrl: 'graphics/postaja.png',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
});

var mymap = L.map('mapid', {
    zoomControl: false,
    preferCanvas: true,
    attributionControl: true,
}).setView([x, y], 13);

var mymapTileLayer = new L.maptilerLayer({
    //apiKey:"Iz6oqHAlxuXztN4SolAF", // For live version 
    apiKey: "Bid81QPElcfo4iUZ8tF2", //For testing -- more permissions
    style: mapStyle,
});
mymapTileLayer.addTo(mymap);

// Open external links in new tab
[...mapid.getElementsByTagName("a")].forEach(a => a.target != "_blank" ? a.target = "_blank" : undefined)

L.tileLayer("", {
    attribution: '',
    maxZoom: 18,
}).addTo(mymap);

var radius, myLocation, myAccuracy;
mymap.locate({
    setView: false,
    maxZoom: 16,
    watch: true
});


//END LEAFLET MAP

/**
 * Locate user on the map
 * @param {*} e map
 */
function onLocationFound(e) {
    var radius = e.accuracy / 2;
    var color = 'var(--color-primary';
    if (!myLocation) {
        myLocation = L.marker(e.latlng, {
            icon: myIconlocation
        }).addTo(mymap);
        myAccuracy = L.circle(e.latlng, radius, { fillColor: color, color: color }).addTo(mymap);
        mymap.flyTo(e.latlng, 13, { duration: 0.5 })
    } else {
        animate(myLocation, e.latlng.lat, e.latlng.lng);
        animate(myAccuracy, e.latlng.lat, e.latlng.lng);
        myAccuracy.setRadius(radius);
    }
    xy = e.latlng;
}
mymap.on('locationfound', onLocationFound);
function onLocationError(e) {
}
mymap.on('locationerror', onLocationError);

/**
 * Center current bus to the center of the map
 */
function centerCurrentBus() {
    if (currentBusId) {
        let currentBus = buses[currentBusId];
        let currentBusCoordinates = [currentBus.lat, currentBus.lon];
        mymap.flyTo(currentBusCoordinates);
    }
}

/**
 * Displays and zooms onto the selected bus. Other buses are hidden. Used for tracking a single bus.
 * @param {*} busId - ID of the bus
 */
async function displayBus(busId) {
    buses = await requestBuses();
    bus = buses.find(bus => bus.vehicle.id === busId);
    trip_id = await findTripIdByVehicle(busId);
    trips = [await obtainDataByTripId(trip_id)].map(trip => {
        trip.trip_id = trip.gtfs_id;
        return trip;
    })

    if (bus) {
        buses[busId] = { ...buses[busId], ...bus, ...bus.vehicle, long: bus.lon, lat: bus.lat };
        drawBuses(buses, automatic = false);
        currentBusId = busId;
        centerCurrentBus();
        m2[busId].openPopup();
    }
    else {
        console.error("Bus not found");
    }
}

/**
 * Animate bus markers
 * @param {*} enMarker Leaflet marker
 * @param {*} newx new latitude
 * @param {*} newy new longitude
 */
function animate(enMarker, newx, newy) {
    var p = 0; // potek interpolacije

    var x = enMarker.getLatLng().lat;
    var y = enMarker.getLatLng().lng;

    var pr = setInterval(function () {
        if (p < 1) {

            newCoords = new L.LatLng(cosp(x, newx, p), cosp(y, newy, p));

            enMarker.setLatLng(newCoords);
            p += 0.1;
        } else {
            x = newx;
            y = newy;
            clearInterval(pr);
        }
    }, 0);
}

/**
 * Bus direction animation
 * @param {*} enMarker Leaflet marker
 * @param {*} newx new latitude
 * @param {*} newy new longitude
 * @param {*} newbear new bearing
 */
function animateDirection(enMarker, newx, newy, newbear) {
    var p = 0;

    var x = enMarker.getLatLng().lat;
    var y = enMarker.getLatLng().lng;
    var pr = setInterval(function () {
        if (p < 1) {
            enMarker.setLatLng(new L.LatLng(cosp(x, newx, p), cosp(y, newy, p)));
            p += 0.1;
            var oldTransform = enMarker._icon.style.transform;
            enMarker["_icon"].dataset.orientacija = newbear;
        } else {
            x = newx;
            y = newy;
            clearInterval(pr);
        }
    }, 0);
}


/**
 * Rotate leaflet popup
 */
function rotatePopup() {
    if (document.getElementsByClassName("leaflet-popup  leaflet-zoom-animated")[0].style.top == "50px") {
        document.getElementsByClassName("leaflet-popup-tip-container")[0].style.top = "";
        document.getElementsByClassName("leaflet-popup-tip-container")[0].style.transform = "";
        document.getElementsByClassName("leaflet-popup  leaflet-zoom-animated")[0].style.top = "";
    } else {
        document.getElementsByClassName("leaflet-popup-tip-container")[0].style.top = "-20px";
        document.getElementsByClassName("leaflet-popup-tip-container")[0].style.transform = "rotate(180deg)";
        document.getElementsByClassName("leaflet-popup  leaflet-zoom-animated")[0].style.top = "50px";
    }
}

/**
 * Calculate how old the bus is
 * @param {*} tstamp timestamp
 * @param {*} busId ID of the bus
 * @returns 
 */
function timespan() {
    let d = new Date();
    let output = "";
    try{
        timestamp = busData[currentBusId].timestamp*1000;
    }   catch (e) {
        return;
    }
    let timespan = (d - new Date(timestamp));

    if (timespan >= 1000 * 3600 * 24) {
        output += (Math.floor(timespan / 1000 / 3600 / 24) + "d ");
        timespan %= (1000 * 3600 * 24);
    }

    if (timespan >= 1000 * 3600) {
        output += (Math.floor(timespan / 1000 / 3600) + "h ");
        timespan %= (1000 * 3600);
    }

    if (timespan >= 1000 * 60) {
        output += (Math.floor(timespan / 1000 / 60) + "min ");
        timespan %= (1000 * 60);
    }

    output += (Math.floor(timespan / 1000) + "s");
    timespan %= (1000);

    try {
        document.getElementById("timeStamp").innerText = output;
    } catch (e) {
    }
    return output;
}

/**
 * Remove Leaflet markers from map
 */
function removeMarkers() {
    for (const [key, value] of Object.entries(m2)) {
        mymap.removeLayer(m2[key]);
        delete m2[key];
    }
    for (const [key, value] of Object.entries(m3)) {
        mymap.removeLayer(m3[key]);
        delete m3[key];
    }
    buses = {};
}

async function  drawBuses(buses, automatic = false) {
    myIcon = busIcon;

    d = new Date(); // Uporabimo kasneje za skrivanje starih busov

    if (!automatic && Object.keys(buses).length === 0) {
        //alert("Ni takih busov, vsaj ne na OJPP");
        //Get element with id 'non_existing'
        var errorPopup = document.getElementById("non_existing");

        //Increase opacity to 0.8 for 3 seconds with animation
        //Also remove the "no" class so display: none is removed and then add it back after 3 seconds
        errorPopup.style.opacity = 0;
        errorPopup.style.transition = "opacity 1s ease-in-out";
        errorPopup.classList.remove("no");
        setTimeout(function () { errorPopup.style.opacity = 0.8; }, 100);
        setTimeout(function () { errorPopup.style.opacity = 0; }, 3000);
        setTimeout(function () { errorPopup.classList.add("no"); }, 4000);
        return;

    }

    for (const [busId, response] of Object.entries(buses)) {
        //console.log(response);
        var x = response["lat"];
        var y = response["lon"];
        var vehicle = response["id"];
        var bear = response["heading"];

        if (x === undefined || y === undefined) {
            alert(`Bus ${vehicle} nima koordinat: ${x}, ${y}`);
            log.innerText += (`\n${vehicle}: ${response["plate"]}, ${response["route_name"]}, urnik: ${response["time_departure"]}; model: ${response?.["model"]?.["name"]}`);
            continue;
        }


        if (!m3[vehicle]) {
            m3[vehicle] = L.marker([x, y], {
                icon: busDirection,
            }).addTo(mymap);

            m3[vehicle]._icon.classList.add("rotated-marker");
            //var oldTransform = m3[vehicle]._icon.style.transform;
            m3[vehicle]["_icon"].dataset.orientacija = bear;

        }
        if (!m2[vehicle]) {
            m2[vehicle] = L.marker([x, y], {
                icon: !(response["trip_id"] === null && response["route_id"] === null && response["route_name"] === null) ? myIcon : peronIcon
            }).addTo(mymap);
        }
        else {
            m2[vehicle].off('popupopen');
        }

        // Check if bus is too old
        busTstamp = new Date(response["timestamp"] * 1000);

        if (!document.getElementById("showOldBuses").checked && d - busTstamp > TIMEOUT) {
            mymap.removeLayer(m2[vehicle]);
            mymap.removeLayer(m3[vehicle]);
            delete m2[vehicle];
            delete m3[vehicle];
            continue;
        }

        if (vehicle === null) {
        } else {
            lng = y;
            lat = x;
            speed = response?.["speed"] ?? `<span style="font-size: xx-small;">${response?.["operator_name"]}</span>` ?? "🤷🏻‍♀️";
            timeDeparture = response?.["time_departure"] ?? "";
            timeArrival = response?.["endStopArrival"] ?? "";
            plate = response?.["plate"] ?? "";
            plate = isNaN(plate[0]) ? `${plate.substr(0, 2)} ${plate.substr(2)}` : `${plate} (morda to ni prava registrska)`;

            busData[vehicle] = response;

            content = ("<img id='eksekuter' src='' onerror='for(let i = 0; i < timers.length; i++) {clearInterval(timers.pop());} timers.push(setInterval(timespan, 1000, \"" + busTstamp + "\", \"" + vehicle + "\"));  timespan(\"" + busTstamp + "\", \"" + vehicle + "\"); this.remove();'/>");

            m2[vehicle].bindPopup(content);

            m2[vehicle].on('popupopen', function () {
                document.getElementById('delay_relation').innerText = response?.["route_name"];
                document.getElementById('delay_container').classList.add('no');
                menuClose();

                lastZoom = mymap.getZoom();
                mymap.flyTo([response["lat"], response["lon"]], Math.max(lastZoom, 15), { duration: 0.5 });
                currentBusId = response["id"];
                currentBusData.displayedGeometry = false;
                refresh();
                openBusContainer();
                

                //Make all other visible markers more opaque
                for (let m in m2) {
                    if (m !== currentBusId){
                        m2[m].setOpacity(0);
                        m3[m].setOpacity(0);
                };
            }

            
            }, { once: true });



            m2[vehicle].on('popupclose', function () {
                hideDelays();
                //Zoom out
                mymap.flyTo([response["lat"], response["lon"]], Math.max(lastZoom, 12), { duration: 0.5 });
                currentBusId = 0;
                document.getElementById("timetable_no_line").classList.remove("no");
                eraseGeometryOnMap();
                closeBusContainer();

                //Restore opacity
                for (let m in m2) {
                    m2[m].setOpacity(1);
                    m3[m].setOpacity(1);
                }

                //Reset global variable
                nextStopData = null;
            });

            m2[vehicle]["busTstamp"] = busTstamp;
            m3[vehicle]["busTstamp"] = busTstamp;

            animate(m2[vehicle], lat, lng);
            animateDirection(m3[vehicle], lat, lng, bear);
            outdateBus(vehicle);
            

        }
    }
}

/**
 * Outdate all buses
 * Outdates leaflet markers
 */
function outdateBuses() {
    for (let m in m2) {
        outdateBus(m);
    }
    for (let m in m3) {
        outdateBus(m);
    }
}

/**
 * Outdate a bus
 * Outdates leaflet markers
 * @param {*} m leaflet marker
 */
function outdateBus(m) {
    let outdateState = clamp((((new Date()) - (new Date(m2[m]["busTstamp"]))) / 1000 - 90) / 300, 0, 1); // New data arrives every 30 seconds, and is 60 seconds old. Fade out the marker slowly for 5 minutes.
    m2[m]["_icon"]["style"]["filter"] = `grayscale(${lerp(0, 89, outdateState)}%) blur(${lerp(0, 0.07, outdateState)}rem) opacity(${lerp(100, 65, outdateState)}%)`
}

let outdating = setInterval(outdateBuses, 20000);




/**
 * Find the trip_id for a given vehicle ID
 * @param {Array} vehicles - Array of vehicle objects from the API response
 * @param {string} currentBusId - The vehicle ID you are searching for
 * @returns {string|null} - The trip_id of the vehicle or null if not found
 */
async function findTripIdByVehicle(busId) {
    // Find the vehicle object with the matching ID
    vehicles = await parseLink(`${apiUrl}/vehicles/locations`);
    const vehicle = vehicles.find(v => v.vehicle.id === busId);

    // Return the trip_id if found, otherwise return null
    return vehicle ? vehicle.trip_id : null;
}

/**
 * 
 * @param {string} tripId - The id of the trip
 * @returns {LineString} - The geometry of the trip
 */
async function obtainGeometryByTripId(tripId) {
    // Get the geometry for the trip
    const geometry = await parseLink(`${apiUrl}/trips/${tripId}/geometry`);
    return geometry;
}

/**
 * Return the data of a trip by its id
 * @param {*} tripId - The id of the trip
 * @returns trip data
 */
async function obtainDataByTripId(tripId) {
    // Get the geometry for the trip
    let today = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    const data = await parseLink(`${apiUrl}/trips/${tripId}?date=${today}`);
    return data;
}

/**
 * Display a LineString geometry on a Leaflet map and clear the previous line if it exists
 * @param {Array} geometry - Array of coordinates [lon, lat] from the LineString
 * @param {Object} options - Optional polyline styling (e.g., color, weight)
 */
/**
 * Display a LineString geometry and optionally stops on a Leaflet map
 * @param {Array} geometry - Array of coordinates [lon, lat] from the LineString
 * @param {Array} stopTimes - Array of stop objects with stop information
 * @param {Object} options - Optional polyline and marker styling
 * @param {boolean} showStops - Whether to display stops along the route
 */
async function displayGeometryOnMap(geometry, stopTimes = [], options = {}, showStops = false) {
    if (!geometry || geometry.length === 0) {
        console.error("Invalid geometry: cannot display on the map.");
        return;
    }

    // Remove the previous polyline if it exists
    if (currentPolyline) {
        mymap.removeLayer(currentPolyline);
        currentPolyline = null;
    }

    // Remove the previous stops layer if it exists
    if (currentStopsLayer) {
        mymap.removeLayer(currentStopsLayer);
        currentStopsLayer = null;
    }

    // Convert [lon, lat] to [lat, lon] for Leaflet
    const latLngs = geometry.map(([lon, lat]) => [lat, lon]);

    // Create a new polyline with optional styling
    currentPolyline = L.polyline(latLngs, {
        color: options.color || '#9e3fd1',
        weight: options.weight || 4,
        opacity: options.opacity || 0.7,
        ...options, // Merge additional options
    }).addTo(mymap);

    // Optionally display stops
    if (showStops && stopTimes.length > 0) {
        const stopMarkers = stopTimes.map(stopTime => {
            const { stop, arrival_scheduled, arrival_realtime, arrival_delay, realtime } = stopTime; // Destructure fields

            // Function to format time (assuming seconds since midnight)
            const formatTime = seconds => {
                if (!seconds || seconds === 0) return 'N/A'; // Handle invalid or missing times
                const date = new Date(seconds * 1000); // Convert seconds to milliseconds
                return date.toISOString().substr(11, 5); // Format as HH:mm
            };

            // Prepare content based on the realtime status
            let tooltipContent = `<b>${stop.name}</b><br>`;
            if (realtime) {
                const realtimeArrival = formatTime(arrival_realtime);
                const delay = arrival_delay !== 0 ? `${Math.round(arrival_delay / 60)} min` : 'Točen';
                tooltipContent += `
                    Predviden prihod: ${realtimeArrival}<br>
                    Zamuda: ${delay}
                `;
            } else {
                const scheduledArrival = formatTime(arrival_scheduled);
                tooltipContent += `Načrtovan prihod: ${scheduledArrival}`;
            }


            const hoverMarker = L.circleMarker([stop.lat, stop.lon], {
                radius: options.stopRadius || 20,
                color: 'transparent',
                fillColor: options.stopFillColor || 'transparent',
                fillOpacity: options.stopFillOpacity || 0.2,
            }).bindTooltip(tooltipContent, {
                permanent: false,
                direction: 'top',
                className: 'stop-tooltip',
            });

            //If clicked on a stop show a toast message
            hoverMarker.on('click', function () {
                toast('Ne klikaj na postaje, ampak zadrži na njej.')
            });

            const visibleMarker = L.circleMarker([stop.lat, stop.lon], {
                radius: options.stopRadius || 4.5,
                color: options.stopColor || '#9e3fd1',
                fillColor: options.stopFillColor || '#9e3fd1',
                fillOpacity: options.stopFillOpacity || 0,
            });

            return L.layerGroup([visibleMarker, hoverMarker]);
        });


        // Add the stop markers to a feature group for easy management
        currentStopsLayer = L.featureGroup(stopMarkers).addTo(mymap);
    }
}

/**
 * Erase the current polyline and stops layer from the map
 */
function eraseGeometryOnMap() {
    if (currentPolyline) {
        mymap.removeLayer(currentPolyline);
        mymap.removeLayer(currentStopsLayer);
        currentPolyline = null;
        currentStopsLayer = null;
        currentBusData.displayedGeometry = false;
    }
}

/**
 * Displays route and stops of a bus on the map
 * @param {object} tripdata - The object containing trip data
 */
async function displayBusRoute(geometry) {
    trip_data = currentBusData.tripData;
    displayGeometryOnMap(geometry.coordinates, trip_data.stop_times, { color: trip_data.color, stopColor: trip_data.color, stopFillColor: trip_data.color }, true);
};


/**
 * Show relavant stops on the map
 * Based on the selected search input item it will show all relavant stops on the map so the appropriate one can be selected.
 * @param {*} busStopName Stop name as in the search results
 */
function displayBusStopsOnMap(busStopName) {
    busStopIDs = busStops[busStopName];
    for (let i = 0; i < busStopIDs.length; i++) {
        let busStop = busStopsData.find(p => p.gtfs_id == busStopIDs[i]);
        if (busStop) {
            let lat = busStop.lat;
            let lon = busStop.lon;
            let marker = L.marker([lat, lon], { icon: peronIcon }).addTo(mymap);
            let menuElement = document.getElementById('menu');

            //On popup open
            marker.on('popupopen', function () {
                selectedStop = busStop.gtfs_id;
                checkDepartures(busStop.gtfs_id);
                menuClose();
                menuElement.classList.add('closed');
                toggleTimetable();

                document.getElementById('timetable_title').innerHTML = busStop.name;
                document.getElementById('timetable_warning').classList.add("no");
            });

            //On popup close
            marker.on('popupclose', function () {
                selectedStop = 0;
                menuClose();
                menuElement.classList.add('closed');
            });

            let content = `<span style="color:var(--color-primary)">${busStop.name}</span>`;
            marker.bindPopup(content);
            // Fly to
            mymap.flyTo([lat, lon], 18.5, { duration: 0.5 });
        }
    }
    toggleSearch();
}


function getNextStopData(stoptimes){
    // Function to format time (assuming seconds since midnight)
    const formatTime = seconds => {
        if (!seconds || seconds === 0) return 'N/A'; // Handle invalid or missing times
        const date = new Date(seconds * 1000); // Convert seconds to milliseconds
        return date.toISOString().substr(11, 5); // Format as HH:mm
    };
    
    if(stoptimes[stoptimes.length-1].realtime === false){
        return null;
    } else {
        next_stop = 0
        for (let i = 0; i < stoptimes.length; i++) {
            if(stoptimes[i].passed === false){
                next_stop = i;
                break 
            }
        }
        const realtimeArrival = formatTime(stoptimes[next_stop].arrival_realtime);
        const delay = stoptimes[next_stop].arrival_delay !== 0 ? `${Math.round(stoptimes[next_stop].arrival_delay / 60)} min` : 'Točen';
        const name = stoptimes[next_stop].stop.name;

        return {arrival: realtimeArrival, delay: delay, name: name};
    }
}


function getStartEndStopData(stoptimes){
    const formatTime = seconds => {
        if (!seconds || seconds === 0) return 'N/A'; // Handle invalid or missing times
        const date = new Date(seconds * 1000); // Convert seconds to milliseconds
        return date.toISOString().substr(11, 5); // Format as HH:mm
    };
    
    //Departure and arrival time for the first and last stop
    const startStop = stoptimes[0];
    const endStop = stoptimes[stoptimes.length-1];

    const startStopName = startStop.stop.name;
    const endStopName = endStop.stop.name;
    const startStopArrival = formatTime(startStop.arrival_scheduled);
    const endStopArrival = formatTime(endStop.arrival_scheduled);

    return {startStopName: startStopName, endStopName: endStopName, startStopArrival: startStopArrival, endStopArrival: endStopArrival};
}

/**
 * Checks if the marker is visible on the map
 * @param {*} marker 
 * @returns true if the marker is visible on the map
 */
function isMarkerInBounds(marker) {
    var bounds = mymap.getBounds();
    return bounds.contains(marker.getLatLng());
}