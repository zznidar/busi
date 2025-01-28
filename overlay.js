let currentPolyline = null; // Variable to store the current polyline
let currentStopsLayer = null; // Variable to store the current stops layer

let base_api = 'https://api.beta.brezavta.si';

/**
 * Find the trip_id for a given vehicle ID
 * @param {Array} vehicles - Array of vehicle objects from the API response
 * @param {string} currentBusId - The vehicle ID you are searching for
 * @returns {string|null} - The trip_id of the vehicle or null if not found
 */
async function findTripIdByVehicle(busId) {
    // Find the vehicle object with the matching ID
    vehicles = await fp(`${base_api}/vehicles/locations`);
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
    const geometry = await fp(`${base_api}/trips/${tripId}/geometry`);
    return geometry;
}

/**
 * Return the data of a trip by its id
 * @param {*} tripId - The id of the trip
 * @returns trip data
 */
async function obtainDataByTripId(tripId) {
    // Get the geometry for the trip
    let today = new Date().toISOString().slice(0,10).replaceAll("-", "");
    const data = await fp(`${base_api}/trips/${tripId}?date=${today}`);
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
function displayGeometryOnMap(geometry, stopTimes = [], options = {}, showStops = false) {
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
                    Načrtovan prihod: ${realtimeArrival}<br>
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
            hoverMarker.on('click', function() {
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
    }
}

/**
 * Displays route and stops of a bus on the map
 * @param {string} busId - The id of the buss 
 */
async function displayBusRoute(busId) {
    trip_id = await findTripIdByVehicle(busId);
    geometry = await obtainGeometryByTripId(trip_id);
    trip_data = await obtainDataByTripId(trip_id);

    displayGeometryOnMap(geometry.coordinates, trip_data.stop_times, { color: trip_data.color, stopColor: trip_data.color, stopFillColor: trip_data.color }, true);

};
