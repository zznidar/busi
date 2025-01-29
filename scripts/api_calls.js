const apiUrl = 'https://api.beta.brezavta.si';
var today = new Date().toISOString().slice(0,10).replaceAll("-", "");
var todayISO = new Date().toISOString().slice(0,10);
var noLoaders = 0;


/**
 * Parses the link and returns the data
 * @param {*} link - The link to parse
 * @returns data
 */
async function parseLink(link) {
    try {
        document.getElementById("loader").classList.remove("no");
        noLoaders++;
        const response = await fetch(link);
        const status = response.status;
        const data = await response.json();

        if (status !== 200) {
            document.getElementById("log").innerText += ('Error' + status);
            return;
        }

        if (data.length === 0) {
            document.getElementById("log").innerText += ('\nNapaka: prazen odgovor!' + data);
        }

        return data;
    } catch (err) {
        document.getElementById("log").innerText += ('Fetch Error :-S' + err);
    } finally {
        if (!--noLoaders) document.getElementById("loader").classList.add("no");
    }
}


/**
 * Return all trips for the given stop IDs
 * @param {*} stops - Array of stop IDs
 * @returns trips - Trips obbject corresponding to the stop IDs
 */
async function requestTrips(stops) {
    let requests = [];
    for (let p of stops) {
        requests.push(parseLink(`${apiUrl}/stops/${encodeURIComponent(p)}/arrivals`));
    }
    let trips = (await Promise.all(requests)).flat();
    return trips;
}


/**
 * Get all current busses
 * @returns Array of current buses
 */
async function requestBuses() {
    return parseLink(`${apiUrl}/vehicles/locations`);
}


/**
 * Get all bus stops
 */
async function requestAllBusStops() {
    busStopsData = await parseLink(`${apiUrl}/stops/`);
    for (let p of busStopsData) {
        if (!p.gtfs_id.startsWith("IJPP:")) continue;
        let name = p.name;
        busStops?.[name]?.push(p.gtfs_id) ?? (busStops[name] = [p.gtfs_id]);
    }
    return;
}

/**
 * Obtain all trips on a bus stop
 * Obtains all trips for a certain stop in a certain time frame.
 * @param {*} stop_id ID of the bus stop
 * @param {*} period Time frame
 * @returns Array of trips
 */
async function requestTripsOnBusStop(stop_id, period) {
    trips = (await parseLink(`${apiUrl}/stops/${stop_id}?date=${today}&current=false`))["arrivals"]; // Set current=true to show only buses which haven't passed the stop yet. However, if no live-tracking is available, it will filter on schedule (not good)!

    //Log just trips that are comming in the next hour
    trips = (trips.filter(trip => (new getTimeAsDate(seconds2time(trip?.departure_realtime) ?? "-24:01:01") - new Date()) < period * 60 * 1000 && (new getTimeAsDate(seconds2time(trip?.departure_realtime) ?? "-24:01:01") - new Date()) > -3 * 60 * 1000));
    return trips;
}


/**
 * Returns vehicle.id from trip_id
 * @param {*} tripId trip_id
 */
function tripId2busId(tripId) {
    console.log("tripId2busId", tripId);
    for (let busId in buses) {
        if (buses[busId].trip_id === tripId) {
            return busId;
        }
    }
}