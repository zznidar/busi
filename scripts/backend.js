var buses = {};
var trips;


lastRelation = [];
//allBuses = false;
const SAVENAME = "busi_shranjene-relacije";
var selectedStop = 0;
var currentBusId = 0;
var lastSearchedBusId = "";

var currentBusData = {};




async function requestLineAllStops(start, end) {
    [trips_start, trips_finish, data_buses] = await Promise.all([
        requestTrips(start),
        requestTrips(end),
        (await requestBuses())
    ]);

    trips = trips_start.filter(trip => trips_finish.some(trip2 => trip.trip_id === trip2?.trip_id && (trip.departure_realtime ?? trip.arrival_realtime) < (trip2?.departure_realtime ?? trip2?.arrival_realtime)
        &&
        ((trip.endStopArrival = (trip2?.arrival_realtime ?? trip2?.departure_realtime)) || true)
        &&
        ((trip.is_realtime = trip2?.realtime) || true)
    ));

    buses_filtered = data_buses.filter(bus => trips.some(trip => trip.trip_id === bus.trip_id));

    for (let t of trips) {
        if (t.vehicle) {
            let id = t.vehicle.id;
            buses[id] = { ...buses[id], ...t.vehicle, time_departure: (t.departure_realtime ?? t.arrival_realtime), endStopArrival: t.endStopArrival, route_name: t.trip_headsign.trim() }; // Koncna postaja LJ AP nima time_departure (koncni Bohinj pa ga ima). 
        }
    }
    for (let b of buses_filtered) {
        let id = b.vehicle.id;
        buses[id] = { ...buses[id], ...b, ...b.vehicle, long: b.lon, lat: b.lat };
    }

    drawBuses(buses, automatic = false, fitView = true);

    if (!currentBusId) {
        printTimetable(trips);
    }
}


/**
 * Function to display trips on the map. If trip is not provided, it will display all trips.
 * It is also used as a callback function from refresh() function.
 * -> old godusModus()
 * @param {*} automatic - True if called from refresh() function
 * @param {*} allBuses - True if all buses should be displayed
 * @returns 
 */
async function showBuses(automatic = false, allBuses = false) {

    if (trips || currentBusId || allBuses) {
        buses_response = (await requestBuses());
        buses_response = buses_response.filter(bus => bus.vehicle.operator_name !== "Ljubljanski Potniški Promet");

        if (allBuses) trips = buses_response;

        if (trips) buses_response = buses_response.filter(bus => trips.some(trip => trip.trip_id === bus.trip_id));
        for (let b of buses_response) {
            let id = b.vehicle.id;
            buses[id] = { ...buses[id], ...b.vehicle, ...b };
        }

        drawBuses(buses, automatic);
        centerCurrentBus();

        if (!currentBusId && !automatic) {
            hideDelays();
        }
    }
    //allBuses = true;
    return;
}


/**
 * Refresh function
 * Refreshes all displayed buses and trips.
 * @param {*} automatic True if called automatically
 */
async function refresh(automatic = false) {

    if (selectedStop) {
        await displayTripsOnStop(selectedStop, 300);
    }

    //Refresh delay status
    if (currentBusId) {
        tripId = buses[currentBusId].trip_id;
        tripData = await obtainDataByTripId(tripId);
        nextStopData = getNextStopData(tripData.stop_times);
        endStopData = getStartEndStopData(tripData.stop_times);

        if (currentBusData.tripId !== tripId || (currentBusData.tripId === tripId && currentBusData.displayedGeometry === false)) {
            geometry = await obtainGeometryByTripId(tripId);
            currentBusData = {busId: currentBusId, tripId: tripId, tripData: tripData, nextStopData: nextStopData, endStopData, endStopData, displayedGeometry: true};
            displayBusRoute(geometry);
        }
        else {
            currentBusData = {busId: currentBusId, tripId: tripId, tripData: tripData, nextStopData: nextStopData, endStopData, endStopData, displayedGeometry: true};
        }

        setPopupContent();
    }

    //Do not center and animate if selected bus is not in the bounds
    if (currentBusId && !isMarkerInBounds(m2[currentBusId])) {
        return ;
    }

    await showBuses(automatic);
    setTimeout(centerCurrentBus, 50);

    document.getElementById("refresh").classList.add("refresh_animate");
    setTimeout(() => {
        document.getElementById("refresh").classList.remove("refresh_animate");
    }, 1000);
}




/**
 * Save a bus line to the local storage
 * @param {*} start - Start bus stop
 * @param {*} finnish - End bus stop
 * @param {*} name - Name of the bus line 
 */
function saveBusLine(start, finish, name) {
    data.set(name, { "start": start, "cilj": finish });
    st.setItem(SAVENAME, JSON.stringify([...data]));
    displayBusLineButtons(data);
}


/**
 * Export presets to a file
 */
function exportPresets() {
    let file = new Blob([JSON.stringify([...data])], { type: "application/json" });
    let a = document.createElement("a");
    a.href = URL.createObjectURL(file);
    a.download = `buses_${(new Date()).getTime()}.json`;
    a.click();
}


/**
 * Migrate old OJPP data to new API
 */
async function migrate() {
    // Migrate from old to new api.
    // For each entry, split the name by en-dash, then find the new ids in the postajalisca_data
    console.log("Migrating", data);

    await requestAllBusStops()
    let newData = new Map();
    for (let [name, relacija] of data) {
        let [entryBusStopName, exitBusStopName] = name.split("–");
        entryBusStop = busStops[entryBusStopName];
        exitBusStop = busStops[exitBusStopName];
        newData.set(name, { "start": entryBusStop, "cilj": exitBusStop });
    }
    data = newData;
    console.log("Migrated", data);
    st.setItem(SAVENAME, JSON.stringify([...data]));
    displayBusLineButtons(data);
    toast("Potekla je migracija shranjenih relacij na novi vir podatkov. Migracija končana. Srečno vožnjo!");
}
// END FAOURITE BUS LINES SECTION


/**
 * Returns the time in the format HH:mm:ss
 * @param {Int} seconds Seconds since midnight
 */
function seconds2time(seconds) {
    let hour = `${Math.floor(seconds / 3600)}`.padStart(2, "0");
    let minute = `${Math.floor((seconds % 3600) / 60)}`.padStart(2, "0");
    let second = `${seconds % 60}`.padStart(2, "0");
    return `${hour}:${minute}:${second}`;
}

/**
 * Parse default OJPP time format as Date object
 * @param {*} timeString OJPP time
 * @returns Time formated in Date() object
 */
function getTimeAsDate(timeString) {
    const [hours, minutes, seconds] = timeString.split(':').map(Number);
    const currentDate = new Date();
    return new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate(),
        hours,
        minutes,
        seconds
    );
}

/**
 * Wrapper function for the correct flow of showing only buses of this stop
 * @param {int} id id of the bus stop (properties.id)
 */
async function checkDepartures(id) {
    console.log(id);
    removeMarkers(); // We want to hide all other buses
    await displayTripsOnStop(id, 300);
    refresh(automatic=true);
}


setInterval(timespan, 1000)