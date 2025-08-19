//Commonly used document elements
TIMETABLE = document.getElementById("timetable");
ADDBUSSTOPCONTAINER = document.getElementById("addBusStopContainer");
BUS_LINE_BUTTONS = document.getElementById("busLineButtons");
var infoTimeout;
var searchTimeout;
var SEARCH_RESULTS = document.getElementById("search_results");
var busStops = {};
entryBusStop = [];
exitBusStop = [];
busStopsData = [];


// Theme styles
var colorTheme =window.getComputedStyle(document.body).getPropertyValue('--color-theme'); //get



/**
 * Show timetable
 * Displays timetable in the timetable menu section for the selected relation in the favorites.
 * @param {*} trips Array of trips 
 */
async function printTimetable(trips) {


    //Edit titles and warnings
    document.getElementById("timetable_title").innerText = "Urnik za izbrano relacijo";
    document.getElementById("timetable_warning").classList.remove('no');

    TIMETABLE.innerHTML = "<thead><tr><td>Ura</td><td>Linija</td><td>Trajanje</td><td>Prevoznik</td></tr></thead>";
    for (let t of trips) {

        //Check if the trip is older than 15 minutes
        date = new Date;
        hour = date.getHours();
        minute = date.getMinutes();

        let tr = document.createElement("tr");

        //Unique id for the row
        tr.id = t.trip_id;

        let td = document.createElement("td");
        td.innerText = `${(seconds2time(t.departure_realtime ?? t.arrival_realtime)).slice(0, 5)}–${seconds2time(t.endStopArrival).slice(0, 5)}`;
        td.classList.add("ura");

        //Bus departure hour and minute
        let busHour = parseInt(seconds2time(t.departure_realtime).slice(0, 2));
        let busMinute = parseInt(seconds2time(t.departure_realtime).slice(3, 5));

        if (busHour < hour - 1) {
            tr.classList.add("missed");
            tr.classList.add("no");
        }
        else if (busHour === hour - 1 && busMinute < minute) {
            tr.classList.add("missed");
            tr.classList.add("no");
        }

        tr.appendChild(td);
        td = document.createElement("td");
        let zeleniRelacijskiGumb = document.createElement("p");
        zeleniRelacijskiGumb.classList.add("zeleniRelacijskiGumb");
        zeleniRelacijskiGumb.innerText = t.trip_headsign.trim();
        td.appendChild(zeleniRelacijskiGumb);
        tr.appendChild(td);
        td = document.createElement("td");

        let HHmmss = seconds2time(t.endStopArrival).split(":");
        let endStopArrivalDate = new Date(todayISO);
        endStopArrivalDate.setHours(...HHmmss);
        
        HHmmss = seconds2time(t.departure_realtime ?? t.arrival_realtime).split(":");
        let departureDate = new Date(todayISO);
        departureDate.setHours(...HHmmss);

        td.innerText = `${Math.round((endStopArrivalDate - departureDate) / 60000)} min`;
        tr.appendChild(td);
        td = document.createElement("td");
        // only fisrt 5 letters of operator name
        td.innerText = t.agency_name.slice(0, 6);
        td.title = t.agency_name.name;
        tr.appendChild(td);
        tr.addEventListener("click", function(e) {
            if (t.trip_id) {
                id = tripId2busId(t.trip_id);
                m2?.[id]?.openPopup() || prepareGeometry(t.trip_id) && menuClose();
            };
        });

        if (t?.realtime || t?.is_realtime) {
            let span = document.createElement("span");
            span.classList.add("material-symbols-outlined");
            span.classList.add('busLive');
            span.innerText = "sensors";
            td.appendChild(span);
            tr.classList.add("tripLive");
        }

        TIMETABLE.appendChild(tr);
    }
    document.getElementById("timetable_no_line").classList.add("no");
}

/**
 * Function for adding custom bus stops for relations to the favourites section
 */

//busStops = {};
async function addBusStops() {
    if (Object.keys(busStops).length === 0) {
        await requestAllBusStops();
    }
    let query = prompt("Vnesi name vstopne postaje").trimEnd();
    if (query.length < 3) {
        alert("Vnesi vsaj 3 črke ... Upam, da nima kakšna postaja krajšega imena 😅");
        return;
    }
    ADDBUSSTOPCONTAINER.innerHTML = "";

    let stops = Object.keys(busStops).sort().filter(p => p.toLowerCase().includes(query.toLowerCase()));
    for (let p of stops) {
        let button = document.createElement("span");
        button.classList.add("btn_busstop");
        button.innerText = p;
        button.onclick = () => {
            entryBusStop = busStops[p];
            entryBusStopName = p;
            let endPoint = prompt("Vnesi name izstopne postaje");
            if (endPoint.length < 3) {
                alert("Vnesi vsaj 3 črke ... Upam, da nima kakšna postaja krajšega imena 😅");
                return;
            }
            ADDBUSSTOPCONTAINER.innerHTML = "";
            let stops = Object.keys(busStops).sort().filter(p => p.toLowerCase().includes(endPoint.toLowerCase()));
            for (let p of stops) {
                let button = document.createElement("span");
                button.classList.add("btn_busstop");
                button.innerText = p;
                button.onclick = () => {
                    exitBusStop = busStops[p];
                    exitBusStopName = p;
                    requestLineAllStops(entryBusStop, exitBusStop);
                    saveBusLine(entryBusStop, exitBusStop, `${entryBusStopName}–${exitBusStopName}`)
                    //Delete bus stop buttons after the relation has been added
                    ADDBUSSTOPCONTAINER.innerHTML = "";
                }
                ADDBUSSTOPCONTAINER.appendChild(button);

            }
        }
        ADDBUSSTOPCONTAINER.appendChild(button);
    }
}

/**
 * Draw favorite relation buttons
 * @param {*} buttons Array of all buttons
 */
function displayBusLineButtons(buttons) {
    BUS_LINE_BUTTONS.innerHTML = "";

    for (let [name, busLine] of buttons) {
        let btn = document.createElement("span");
        btn.type = "span";
        btn.onclick = () => {
            m2[currentBusId]?.closePopup();
            requestLineAllStops(start = busLine.start, finish = busLine.cilj);
            lastRelation = [busLine.start, busLine.cilj];
            removeMarkers();
            toggleTimetable();
            menuClose();
        }

        //Use eventListener so touch computer can use it
        btn.addEventListener('touchstart', startTouch);
        btn.addEventListener('touchend', endTouch);

        //For non-touch devices
        btn.addEventListener('mousedown', startTouch);
        btn.addEventListener('mouseup', endTouch);

        var timeout;
        function startTouch() {
            timeout = setTimeout(() => {
                btn.remove();
                data.delete(name);
                st.setItem(SAVENAME, JSON.stringify([...data]));
            }, 2000);
        }

        function endTouch() {
            clearTimeout(timeout);
        }

        btn.innerText = name;
        btn.classList.add("btn_busline");
        BUS_LINE_BUTTONS.appendChild(btn);
    }
}

// FAVOURITE BUS LINES SECTION
const st = localStorage;
data = new Map(JSON.parse(st.getItem(SAVENAME))); // We use maps to maintain order
if (data.size) {
    if (!`${data?.entries()?.next()?.["value"]?.[1]?.["start"]?.[0]}`?.includes(":")) {
        toast("Poteka migracija shranjenih relacij na novi vir podatkov ...")
        migrate();
    }
    displayBusLineButtons(data);
}

/**
 * Display trips on bus stop
 * Displays all trips on the selected bus stop in the timetable section. Calculates time upon arrival and live status.
 * @param {*} stopid ID of the bus stop
 * @param {*} period Time frame
 */
async function displayTripsOnStop(stopid, period = 60) {
    filtered = await requestTripsOnBusStop(stopid, period);

    //Display the trips
    TIMETABLE.innerHTML = `
    <thead><tr><td>Linija</td><td style='padding-right:30px'>Prihod</td></tr></thead>`;
    for (let t of filtered) {

        //Check if the trip is older than 15 minutes
        date = new Date;
        hour = date.getHours();
        minute = date.getMinutes();

        let tr = document.createElement("tr");
        //Unique id for the row
        tr.id = t.trip_id;

        let td = document.createElement("td");
        let zeleniRelacijskiGumb = document.createElement("p");
        zeleniRelacijskiGumb.classList.add("zeleniRelacijskiGumb");
        zeleniRelacijskiGumb.innerText = t.trip_headsign.trim();
        td.style.paddingLeft = "15px";
        td.style.width = "70%";
        td.appendChild(zeleniRelacijskiGumb);
        tr.appendChild(td);
        td = document.createElement("td");

        //Calculate the time difference
        minToArrival = ((new Date(`${todayISO}T${seconds2time(t.departure_realtime ?? t.arrival_realtime)}`) - new Date()) / 60000).toFixed(0);

        if (minToArrival < 60) {
            td.innerText = `${minToArrival} min`;
        }
        else {
            td.innerText = `${seconds2time(t.departure_realtime).slice(0, 5)}`;
        }
        td.style.paddingRight = "30px";
        tr.appendChild(td);
        tr.dataset.tripid = t.trip_id;
        tr.addEventListener("click", function(e) {
            if (t.trip_id) {
                id = tripId2busId(t.trip_id);
                m2?.[id]?.openPopup() || prepareGeometry(t.trip_id) && menuClose();
            };
        });

        if (t?.realtime || t?.is_realtime) {
            let span = document.createElement("span");
            span.classList.add("material-symbols-outlined");
            span.classList.add('busLive');
            span.innerText = "sensors";
            td.appendChild(span);
            tr.classList.add("tripLive");
        }
        TIMETABLE.appendChild(tr);
    }
    document.getElementById("timetable_no_line").classList.add("no");
}

/**
 * Search for a bus by ID
 */
async function searchBusId() {
    lastSearchedBusId = prompt("Vnesi ID avtobusa", lastSearchedBusId);
    displayBus(lastSearchedBusId);
}

var toastTT1, toastTT2, toastTT3;
/**
 * Display a toast message
 * @param {*} message - Message to be displayed in the toast
 */
function toast(message) {
    clearTimeout(toastTT1);
    clearTimeout(toastTT2);
    clearTimeout(toastTT3);
    let toast = document.getElementById("toast_message");
    toast.getElementsByTagName("p")[0].innerText = message;

    //Increase opacity to 0.8 for 3 seconds with animation
    //Also remove the "no" class so display: none is removed and then add it back after 3 seconds
    toast.style.opacity = 0;
    toast.style.transition = "opacity 1s ease-in-out";
    toast.classList.remove("no");
    toastTT1 = setTimeout(function() { toast.style.opacity = 0.8; }, 100);
    toastTT2 = setTimeout(function() { toast.style.opacity = 0; }, 3000);
    toastTT3 = setTimeout(function() { toast.classList.add("no"); }, 4000);
}

/**
 * Function to toggle the info container
 */
function toggleInfo() {
    var element = document.getElementById('info');
    element.classList.toggle('closed');

    clearTimeout(infoTimeout);
    if (element.classList.contains('closed')) {
        fadeIn('info', 100);
    }
    else {
        infoTimeout = fadeOut('info', 100);
    }

}


function openBusContainer(){
    var element = document.getElementById('busInfoContainer');
    element.classList.remove('closed');
    fadeIn('busInfoContainer', 100);
}

function closeBusContainer(){
    var element = document.getElementById('busInfoContainer');
    element.classList.add('closed');
    fadeOut('busInfoContainer', 100);
}

/**
 * Function to close the menu/scrollable site container
 */
function menuClose() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Function to open the menu/scrollable site container
 */
function menuOpen() {
    var element = document.getElementById('menu');
    element.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
}


/**
 * Open menu and show delays    
 * It is used to show only delays after then button is pressed on viechle popup
 */
function delayOpen() {
    setTimeout(function() {
        var element = document.getElementById('delay_container')
        var elementTimetable = document.getElementById("timetable_container");
        var elementFavorite = document.getElementById("favorites");

        elementTimetable.classList.add("no");
        elementFavorite.classList.add("no");
        element.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" })
    }, 100); // Adjust the delay (in milliseconds) to make it slower
}

/**
 * Toggle favorite container
 * Switches from any other display onto the favorite container. If the favorite container is already displayed, it will close it.
 */
function toggleFavorite() {
    var elementFavorite = document.getElementById("favorites");
    var elementTimetable = document.getElementById("timetable_container");
    var elementMenu = document.getElementById("menu");
    var elementDelay = document.getElementById("delay_container");

    //If favorite is visible, close menus, change visibilites and toggle menu
    if (elementFavorite.classList.contains("no")) {
        elementTimetable.classList.add("no");
        elementDelay.classList.add("no");
        setTimeout(function() {
            elementFavorite.classList.remove("no");
            elementTimetable.classList.add("no");
            elementDelay.classList.add("no");
        }, 100);
        menuOpen();

        elementMenu.classList.remove("closed");

    }
    else { toggleMenu(); }

}

/**
 * Toggle timetable container
 * Switches from any other display onto the timetable container. If the timetable container is already displayed, it will close it.
 */
function toggleTimetable() {

    var elementFavorite = document.getElementById("favorites");
    var elementTimetable = document.getElementById("timetable_container");
    var elementMenu = document.getElementById("menu");
    var elementDelay = document.getElementById("delay_container");
    var delayContent = document.getElementById("delay_content");

    //If favorite is visible, close menus, change visibilites and toggle menu
    if (elementTimetable.classList.contains("no")) {
        //if (!elementMenu.classList.contains("closed")) {
        //menuClose();
        elementFavorite.classList.add("no");
        setTimeout(() => {
            elementTimetable.classList.remove("no");
            elementFavorite.classList.add("no");

            if (delayContent.innerHTML != '\n\t\t\t') {
                elementDelay.classList.remove("no");
            }

        }, 100);
        menuOpen();
        elementMenu.classList.remove("closed");

    }
    else {
        toggleMenu();
    }
}

/**
 * Toggles search container
 */
async function toggleSearch() {
    var element = document.getElementById("search_container");
    element.classList.toggle("closed");

    clearTimeout(searchTimeout);
    if (element.classList.contains("closed")) {
        menuClose();
        closeBusContainer();
        document.getElementById('menu').classList.add('closed');
        fadeIn('search_container', 100);
        document.getElementById("search_field").focus();
    }
    else {
        searchTimeout = fadeOut('search_container', 100);
        if (currentBusId){
            openBusContainer();
        }
    }

    if (Object.keys(busStops).length === 0) {
        await requestAllBusStops();
        const event = new Event("input");
        document.getElementById("search_field").dispatchEvent(event);
    }
}

const UA = navigator.userAgent;
const isWebkit =
    /WebKit/.test(UA) &&
    !/Edge/.test(UA) &&
    !window.MSStream;

/**
 * Update search results 
 * Updates the search results based on the input in the search field (live search)
 * @param {*} e Current search input
 */
function updateSearch(e) {
    let query = e.target.value;
    var search_results_container = document.getElementById("search_results_container");
    SEARCH_RESULTS.innerHTML = "";
    if (query.length >= 3) {
        let stops = Object.keys(busStops).sort().filter(p => p.toLowerCase().includes(query.toLowerCase()));
        for (let p of stops) {
            let li = document.createElement("li");
            li.innerHTML = p;
            li.dataset.busStopName = p;
            SEARCH_RESULTS.appendChild(li);


        }

        if (isWebkit) {
            SEARCH_RESULTS.style.height = "fit-content";
            SEARCH_RESULTS.style.minHeight = "3rem";
            search_results_container.style.opacity = "0.9";
            SEARCH_RESULTS.style.transition = "all 0.2s ease-in-out;";
        }

    }
    else if (!SEARCH_RESULTS.innerHTML && isWebkit) {
        SEARCH_RESULTS.style.height = "0";
        SEARCH_RESULTS.style.minHeight = "0";
        search_results_container.style.opacity = "0";
    }
    updownselect();
}

SEARCH_RESULTS.addEventListener("click", function(e) {
    console.log(e);
    // Close potentially open bus popups to prevent map auto-panning on location update
    m2[currentBusId]?.closePopup();
    if (e.target.tagName === "LI") {
        displayBusStopsOnMap(e.target.dataset.busStopName);
    }
});


/**
 * Handle keyboard selection of search results
 */
updownselectindex = -1;
function updownselect(e) {
    console.log("updownselect: ", e);
    let shownResults = document.getElementById("search_results").getElementsByTagName("li");
    shownResults[updownselectindex]?.classList.remove("selected");
    switch(e?.key) {
        case "ArrowDown":
            e.preventDefault();
            updownselectindex = ++updownselectindex%shownResults.length;
            break;
        case "ArrowUp":
            e.preventDefault();
            updownselectindex = (--updownselectindex + shownResults.length)%shownResults.length;
            break;
        case "Enter":
            shownResults[updownselectindex]?.click();
            break;
        default:
            updownselectindex = -1;
            //updownselectindex = updownselectindex% shownResults.length;
    }
    shownResults[updownselectindex]?.classList.add("selected");
    if(!!shownResults[updownselectindex]?.scrollIntoViewIfNeeded) {
        shownResults[updownselectindex]?.scrollIntoViewIfNeeded(false);
    } else {
        // https://bugzilla.mozilla.org/show_bug.cgi?id=403510
        shownResults[updownselectindex]?.scrollIntoView({block: "center", container: "nearest" });
    }
}

document.getElementById("search_field").addEventListener("input", updateSearch);
document.getElementById("search_container").addEventListener("keydown", updownselect);


/**
 * Toggle menu/site cointainer
 * It will close the menu/site container based on current state and position. If not fully closed it will open and not close.
 */
function toggleMenu() {

    var element = document.getElementById('menu');
    element.classList.toggle('closed');

    if (!element.classList.contains('closed')) {
        menuOpen();
    }
    else if (element.classList.contains('closed') && document.getElementById('menu').getBoundingClientRect().top == window.innerHeight - 120) {
        menuOpen();
    }
    else {
        //Scroll to the top with animation
        menuClose();
    }
}


//Auto refresh every 20 seconds
refresher = setInterval(function() {
    refresh(automatic = true);
}, 20000);

// Stop auto-refreshing after 5 minutes of inactivity
setTimeout(function() {
    clearInterval(refresher);
}, 5 * 60 * 1000);

//Handle offline situation
window.addEventListener('offline', function(event) {
    console.log("offline");
    showOfflineWarning();
});

//Handle offline situation
window.addEventListener('online', function(event) {
    console.log("online");
    hideOfflineWarning();

    // Re-initialise MapTiler if needed:
    if (!document.getElementsByClassName("maplibregl-ctrl-icon")?.length) {
        console.log("Maptiler wasn't successfully initialised (user opened without internet). Reinitialising ...");
        mymapTileLayer._initMaptilerSDK();
        console.log("We hope of success!");
    }
});

showOfflineWarning = function() {
    fadeIn("offline", 1000);
}

hideOfflineWarning = function() {
    fadeOut("offline", 1000);
}

/**
 * Hide delays information
 */
function hideDelays() {
    menuClose();
    //Wait for the animation to finish
    setTimeout(() => {
        document.getElementById("delay_container").classList.add("no");
    }, 500);

}


/**
 * Show all delays
 * Show all delays in the delays container.
 */
async function showAll() {
    //Search for all elements with class no zamude inside the zamudiceContainer
    let elements = [...document.getElementsByClassName("no zamude")];
    for (let e of elements) {
        e.classList.remove("no");
    }
    document.getElementsByClassName("btn_delay_more")[0].classList.add("no");
}

var fadator = {};
/**
 * Fade in selected element with animation
 * Animation fade in function for elements that need to be displayed over map so display:none must be present.
 * @param {*} elementID Id name of the element in HTML
 * @param {*} time Animation duration in miliseconds
 */
function fadeIn(elementID, time) {
    clearTimeout(fadator?.[elementID]);
    var element = document.getElementById(elementID);
    element.style.transition = `opacity ${time / 1000}s ease-in-out`;
    element.style.opacity = 0;
    element.classList.remove("no");
    setTimeout(function() { element.style.opacity = 0.95; }, 34);
}

/**
 * Fade out selected element with animation
 * Animation fade out function for elements that need to be displayed over map so display:none must be present.
 * @param {*} elementID Id name of the element in HTML
 * @param {*} time Animation duration in miliseconds
 * @returns 
 */
function fadeOut(elementID, time) {
    var element = document.getElementById(elementID);
    element.style.opacity = 0;
    return fadator[elementID] = setTimeout(function() { element.classList.add("no"); }, time);
}



// Get the busId from the URL
const urlParams = new URLSearchParams(window.location.search);
const busId = urlParams.get('busId'); // e.g., https://link?busId=123

// Display the result

document.addEventListener("DOMContentLoaded", function() {
    if (busId) {
        displayBus(busId);
    } else {
        toggleFavorite();
    }

    // TODO: Make this a beautiful tooltip
    document.getElementById("directions_bus_container").addEventListener("mouseover", function() {
        alert(`Prevoznik: ${buses?.[currentBusId]?.["operator_name"]}`);
    });
});

// Make sharable button apear for all popups
if (typeof navigator.share === 'undefined') {
    document.getElementsByClassName("shareContainer")[0].attributes.setNamedItem(document.createAttribute("disabled"));
}

/**
 * Share bus by ID
 * Share bus by ID using the share API
 * @param {*} busId ID of the bus
 */
function share(busId) {
    let url = new URL(window.location);
    url.searchParams.set('busId', busId);
    console.log(url.href);
    try {
        navigator.share({
            title: 'Sledi avtobusu',
            text: 'Klikni na povezavo in sledi mojemu avtobusu',
            url: url.href
        });
    } catch (e) {
        console.error("Sharing failed: ", e);
    }
}

/**
 * Function to set the content of the popup for current line
 * @param {*} reset - True if the popup current line should be reset
 */
function setPopupContent(reset=false){
    reset_text = "nalaganje...";
    if (reset) {
        currentBusData = {busId: null, tripId: null, tripData: null, nextStopData: null, endStopData: null, displayedGeometry: false};
        document.getElementById('directions_bus_container').style.opacity = "1";
        document.getElementById('currentStopName').style.opacity = "1";
        document.getElementById('currentStopTime').style.opacity = "1";
    }

    if (!nextStopData && !reset) {
        document.getElementById('directions_bus_container').style.opacity = "0";
        document.getElementById('currentStopName').style.opacity = "0";
        document.getElementById('currentStopTime').style.opacity = "0";
    }

    document.getElementById('startStopName').innerText = currentBusData.endStopData?.startStopName ?? reset_text;
    document.getElementById('endStopName').innerText = currentBusData.endStopData?.endStopName ?? reset_text;
    document.getElementById('currentStopName').innerText = currentBusData.nextStopData?.name ?? reset_text;

    if ((currentBusData.endStopData?.startStopArrival !== currentBusData.endStopData?.startStopArrivalRealtime) && currentBusData.endStopData){
        document.getElementById('startStopTime').innerHTML = `<s style="opacity:0.6">${currentBusData.endStopData?.startStopArrival}</s>&nbsp;&nbsp;${currentBusData.endStopData?.startStopArrivalRealtime}`;
    } else {
        document.getElementById('startStopTime').innerText = currentBusData.endStopData?.startStopArrival ?? reset_text;
    }

    if ((currentBusData.endStopData?.endStopArrival !== currentBusData.endStopData?.endStopArrivalRealtime) && currentBusData.endStopData){
        document.getElementById('endStopTime').innerHTML = `<s style="opacity:0.6">${currentBusData.endStopData?.endStopArrival}</s>&nbsp;&nbsp;${currentBusData.endStopData?.endStopArrivalRealtime}`;
    } else {
        document.getElementById('endStopTime').innerText = currentBusData.endStopData?.endStopArrival ?? reset_text;
    }

    document.getElementById('currentStopTime').innerText = `${currentBusData.nextStopData?.arrival ?? reset_text} , zamuda: ${currentBusData.nextStopData?.delay ?? reset_text}`;
}

//Periodicaly check if marker is in bounds, if not fade in the returnView button
setInterval(() => {
    if(currentBusId){
        if (!isMarkerInBounds(m2[currentBusId])) {
            fadeIn("returnView", 1000);
        }
        else {
            fadeOut("returnView", 1000);
        }
    }
}, 1000);


menuClose()

