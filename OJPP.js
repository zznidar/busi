//const ENDPOINT = "../";
var noLoaders = 0;
/**
 * Parse JSON from link
 * @param {*} link Link (API endpoint)
 * @returns Parsed JSON
 */
async function fp(link) {
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
            // alert("OJPP je padel dol?");
            // return;
        }
        
        return data;
    } catch (err) {
        document.getElementById("log").innerText += ('Fetch Error :-S' + err);
    } finally {
        if(!--noLoaders) document.getElementById("loader").classList.add("no");
    }

}

busi = {};
test = "KEKEKEKE";

/**
 * Request trips for bus stop
 * Requests all trips for the selected bus stop with OJPP API
 * @param {*} postajalisca Array of bus stops
 * @returns Array of all trips
 */
async function zahtevaj_voznje(postajalisca) {
    let requesti = [];
    for(let p of postajalisca) {
        //requesti.push(fp(`${ENDPOINT}posodobi-ojpp.php?postaja=${p}`));
        requesti.push(fp(`https://ojpp.si/api/stop_locations/${p}/arrivals`));
    }
    let tripsi = (await Promise.all(requesti)).flat();
    return tripsi;
}

async function zahtevaj_relacijo_vsi_peroni(start, cilj) {
    [trips_start, trips_cilj, data_buses] = await Promise.all([
        zahtevaj_voznje(start),
        zahtevaj_voznje(cilj),
        (await zahtevaj_buse())["features"]
    ]);

    trips = trips_start.filter(trip => trips_cilj.some(trip2 => trip.trip_id === trip2?.trip_id && (trip.time_departure ?? trip.time_arrival) < (trip2?.time_departure ?? trip2?.time_arrival)
    &&
    ((trip.prihodNaCilj = (trip2?.time_arrival ?? trip2?.time_departure)) || true)
    ));

    buses = data_buses.filter(bus => trips.some(trip => trip.trip_id === bus.properties.trip_id));



    // Ce je bus trenutno na voznji na tej relaciji, trip vsebuje vehicle -> plate, toda ne lokacije
    for(let t of trips) {
        if(t.vehicle) {
            let id = t.vehicle.id;
            busi[id] = {...busi[id], ...t.vehicle, time_departure: (t.time_departure ?? t.time_arrival), prihodNaCilj: t.prihodNaCilj, route_name: t.route_name.trim()}; // Koncna postaja LJ AP nima time_departure (koncni Bohinj pa ga ima). 
        }
    }
    for(let b of buses) {
        let id = b.properties.vehicle_id;
        busi[id] = {...busi[id], ...b.properties, long: b.geometry.coordinates[0], lat: b.geometry.coordinates[1]};
    }

    izrisi_OJPP(busi);

    if(!currentBusId){
        izpisi_urnik(trips);
    }
}

/**
 * Get all current busses
 * @returns Array of current buses
 */
async function zahtevaj_buse() {
    return fp(`https://ojpp.si/api/vehicle_locations`);
}

NA_POSTAJALISCU_THRESHOLD = 100; // metres
/**
 * Calculate delay
 * Calculates delay for the selected bus. Resouce heavy task.
 * @param {*} busId Id of the bus
 * @returns Array of delays for each stop
 */
async function zahtevaj_zamudo(busId) {

    danes = new Date().toISOString().slice(0,10);
    location_track = (await fp(`https://ojpp.si/api/vehicles/${busId}/locations_geojson/?date=${danes}`))["features"];
    trip_details = (await fp(`https://ojpp.si/api/trips/${busi[busId]["trip_id"]}/details/`))["stop_times"];
    let odhodSPrvePostaje = new Date(`${danes}T${trip_details[0]["time_departure"]}:00`);
    let zamude = [];
    //TODO: Vzamemo samo tracking točke, ki vsebujejo trip_id, za katerega računamo zamudo. Na ta način se losamo raznih "Ljubljana Tivoli: --54 min", ko se je še peljal na šiht.
        // Possible problem: Včasih bus nima pravilno vnesenega trip_id-ja (ampak potem se tudi na zemljevidu ne pojavi. To bi bil problem le v GodModusu)
    for(let t = location_track.length-1; t >= 0; t--) {
        let busLatLng = [location_track[t].geometry.coordinates[1], location_track[t].geometry.coordinates[0]];
        for(let p = 0; p < trip_details.length; p++) {
            let stopLatLng = [trip_details[p]["stop"]["location"]["lat"], trip_details[p]["stop"]["location"]["lon"]];
            if(mymap.distance(busLatLng, stopLatLng) < NA_POSTAJALISCU_THRESHOLD) {
                let busJeBil = new Date(location_track[t].properties.time);
                let uraOdhodaISO = `${danes}T${trip_details[p]["time_departure"] ?? trip_details[p]["time_arrival"]}:00`;
                let busJeMoralBiti = new Date(uraOdhodaISO);
                let postaja = trip_details[p]["stop"]["name"];
                let zamuda = Math.round((new Date(location_track[t].properties.time) - new Date(uraOdhodaISO)) / 60000);
                zamude.push({postaja: postaja, zamuda: zamuda});

                // Remove this and all next stops from trip_details because zamuda was already calculated
                trip_details.splice(p, trip_details.length - p);
                
                // Remove this stop from trip_details because zamuda was already calculated
                //trip_details.splice(p, 1);

                if(busJeBil < odhodSPrvePostaje) {
                    return zamude;
                }
            }
        }
    }
    return zamude;
}

/**
 * Display delay
 * Displays delays for the selected bus in the special container. They are not automatically recalculated.
 * @param {*} gumb Button property linked
 * @param {*} busId Id of the bus
 * @param {*} stPostaj Number of stops to be displayed folded
 */
async function izpisi_zamudo2(gumb, busId, stPostaj = 5) {
    let zamude = await zahtevaj_zamudo(busId);
    let zamudeHTML = "";
    let items = 0;

    for(let z of zamude) {
        if(zamudeHTML === "") {
            zamudeHTML += `
                <div class="zamuda_entry first">
                    <span class="material-symbols-outlined ${z.zamuda <= 0 ? "green" : "red"}" style="font-size: 1.1em; transform:translate(0.075rem,0.35em); position:absolute; z-index:100; color:var(--color-primary)">directions_bus</span>
					<span class="zamuda_line ${z.zamuda <= 0 ? "green" : "red"}" style="height:2.5rem; margin-top:-0.5rem"></span>
					<span class="dot big ${z.zamuda <= 0 ? "green" : "red"}"></span>
					<span class="postaja" style="margin-left:-0.5rem">${z.postaja}</span>
					<span class="zamuda ${z.zamuda <= 0 ? "green" : "red"}" style="padding-top:0.5rem">${z.zamuda} min</span>
				</div>
            `
            continue;
        }
        items++;
        zamudeHTML += `<div class="zamuda_entry ${(items > stPostaj) ? 'no zamude' : ''}">
            <span class="zamuda_line ${z.zamuda <= 0 ? "green" : "red"}"></span>
            <span class="dot ${z.zamuda <= 0 ? "green" : "red"}"></span>
            <span class="postaja">${z.postaja}</span>
            <span class="zamuda ${z.zamuda <= 0 ? "green" : "red"}">${z.zamuda} min</span>
        </div>`;
    }
    if(items > stPostaj) zamudeHTML += "<span class='btn_delay_more center' onclick = 'pokaziVse()'>Pokaži vse postaje</span>"

    //Display delays in the page continer rather
    let delay_container = document.getElementById("delay_container");
    let delay_content = document.getElementById("delay_content");

    delay_content.innerHTML = zamudeHTML;
    delay_container.classList.remove("no");
    delayOpen();




}



TIMETABLE = document.getElementById("timetable");
/**
 * Show timetable
 * Displays timetable in the timetable menu section for the selected relation in the favorites.
 * @param {*} trips Array of trips 
 */
async function izpisi_urnik(trips) {

    //Edit titles and warnings
    document.getElementById("timetable_title").innerText = "Urnik za izbrano relacijo";
    document.getElementById("timetable_warning").classList.remove('no');

    TIMETABLE.innerHTML = "<thead><tr><td>Ura</td><td>Linija</td><td>Trajanje</td><td>Prevoznik</td></tr></thead>";
    for(let t of trips) {

        //Check if the trip is older than 15 minutes
        date = new Date;
        hour = date.getHours();
        minute = date.getMinutes();

        

        let tr = document.createElement("tr");

        //Unique id for the row
        tr.id = t.trip_id;

        let td = document.createElement("td");
        td.innerText = `${(t.time_departure ?? t.time_arrival).slice(0, 5)}–${t.prihodNaCilj.slice(0, 5)}`;
        td.classList.add("ura");

        //Bus departure hour and minute
        let busHour = parseInt(t.time_departure.slice(0, 2));
        let busMinute = parseInt(t.time_departure.slice(3, 5));

        if(busHour < hour - 1) {
            tr.classList.add("missed");
        }
        else if(busHour === hour - 1 && busMinute < minute) {
            tr.classList.add("missed");
        }

        tr.appendChild(td);
        td = document.createElement("td");
        let a = document.createElement("a");
        a.href = `https://ojpp.si/trips/${t?.["trip_id"]}`;
        a.target = "_blank";
        a.innerText = t.route_name.trim();
        td.appendChild(a);
        tr.appendChild(td);
        td = document.createElement("td");
        td.innerText = `${(new Date(`${danes}T${t.prihodNaCilj}`) - new Date(`${danes}T${t.time_departure ?? t.time_arrival}`)) / 60000} min`;
        tr.appendChild(td);
        td = document.createElement("td");
        // only fisrt 5 letters of operator name
        td.innerText = t.operator.name.slice(0, 6);
        td.title = t.operator.name;
        tr.appendChild(td);
        TIMETABLE.appendChild(tr);
    }

    //Hide no line warning
    document.getElementById("timetable_no_line").classList.add("no");

    //We will hide them later when entries are already in the table
    document.getElementById("timetable_sync_warning").classList.remove("no");
    for(let t of trips) {
        result = await checkForDeletedElement(`https://ojpp.si/trips/${t?.["trip_id"]}`);
        if (result) {
            //Add class hidden to the row
            document.getElementById(t.trip_id).classList.add("no");

        }
    }
    document.getElementById("timetable_sync_warning").classList.add("no");

}




//Check if bus is deleted
// Function to check if the element with ID "DELETED" exists on the target website

/**
 * Check if bus schedule is outdated
 * Crawls the OJPP bus schedule page and checks if the bus is marked as deleted. Should be replaced as soon as API is updated.
 * @param {*} url URL for the bus schedule
 * @returns True if deleted
 */
async function checkForDeletedElement(url) {
    // Make an HTTP GET request to the target website
    return fetch(url)
    .then(response => response.text())
    .then(html => {
        // Check if the response text includes the string 'is-danger'
        return html.includes('is-danger');
    });
}





var trips;
/**
 * Display all buses on map
 * Displays all buses on the map. Resource heavy as it is also automaticaly refreshed.
 * @param {*} automatic Bool if automatic refresh
 * @returns Nothing
 */
async function godusModus(automatic=false) {
    buses = (await zahtevaj_buse())["features"];
    buses = buses.filter(bus => bus.properties.operator_name !== "Javno podjetje Ljubljanski potniški promet d.o.o."); // Odstranimo LPP, ker imamo zanje svoj gumb (LPP), ki pravilno prikaze vec info (registrska, hitrost ...). Ministrski podatki vsebujejo le null, null. Strålande null.

    if(trips) buses = buses.filter(bus => trips.some(trip => trip.trip_id === bus.properties.trip_id));
    for(let b of buses) {
        let id = b.properties.vehicle_id;
        busi[id] = {...busi[id], ...b.properties, long: b.geometry.coordinates[0], lat: b.geometry.coordinates[1]};
    }

    izrisi_OJPP(busi, automatic);
    centerCurrentBus();

    if(!currentBusId && !automatic){
        hideDelays();
    }
    
    allBuses = true;
    return;
}

postajalisca = {}
vstopnaPostaja = [];
izstopnaPostaja = [];
data_postajalisca = [];

/**
 * Request all bus stops
 * Requests all bus stops from the OJPP API and saves them to the global variable postajalisca
 * @returns Nothing
 */
async function zahtevaj_vsa_postajalisca() {
    data_postajalisca = (await fp(`https://ojpp.si/api/stop_locations`))["features"];
    for(let p of data_postajalisca) {
        let name = p.properties.name;
        postajalisca?.[name]?.push(p.properties.id) ?? (postajalisca[name] = [p.properties.id]);
    }
    return;
}

/**
 * Add stop for favorites
 * Entry point for adding a stop to the favorites. 
 * @returns 
 */
async function dodajPostaje() {
    // Ko bo https://bugzilla.mozilla.org/show_bug.cgi?id=1535985 fixed, lahko končno uporabimo datalist autocomplete.
    if(Object.keys(postajalisca).length === 0) {
        await zahtevaj_vsa_postajalisca();
    }
    let query = prompt("Vnesi ime vstopne postaje");
    if(query.length < 3) {
        alert("Vnesi vsaj 3 črke ... Upam, da nima kakšna postaja krajšega imena 😅");
        return;
    }   
    document.getElementById("dodajanjePostajContainer").innerHTML = "";

    let postaje = Object.keys(postajalisca).filter(p => p.toLowerCase().includes(query.toLowerCase()));
    for(let p of postaje) {
        let button = document.createElement("span");
        button.classList.add("btn_busstop");
        button.innerText = p;
        button.onclick = () => {
            vstopnaPostaja = postajalisca[p];
            imeVstopnePostaje = p;
            let cilj = prompt("Vnesi ime izstopne postaje");
            if(cilj.length < 3) {
                alert("Vnesi vsaj 3 črke ... Upam, da nima kakšna postaja krajšega imena 😅");
                return;
            }
            document.getElementById("dodajanjePostajContainer").innerHTML = "";
            let postaje = Object.keys(postajalisca).filter(p => p.toLowerCase().includes(cilj.toLowerCase()));
            for(let p of postaje) {
                let button = document.createElement("span");
                button.classList.add("btn_busstop");
                button.innerText = p;
                button.onclick = () => {
                    izstopnaPostaja = postajalisca[p];
                    imeIzstopnePostaje = p;
                    zahtevaj_relacijo_vsi_peroni(vstopnaPostaja, izstopnaPostaja);
                    shraniRelacijo(vstopnaPostaja, izstopnaPostaja, `${imeVstopnePostaje}–${imeIzstopnePostaje}`)
                    //Delete bus stop buttons after the relation has been added
                    document.getElementById("dodajanjePostajContainer").innerHTML = "";
                }
                document.getElementById("dodajanjePostajContainer").appendChild(button);
                
            }
            
        }
        document.getElementById("dodajanjePostajContainer").appendChild(button);
    }

    
}

//Marko implementation of refresh
lastRelation = [];
allBuses = false;

/**
 * Refresh function
 * Refreshes all displayed buses and trips.
 * @param {*} automatic True if called automatically
 */
async function refresh(automatic=false) {
 
    if(selectedStop){
        await displayTripsOnStop(selectedStop, 300);
    }

    await godusModus(automatic);
    setTimeout(centerCurrentBus, 50);
 
    document.getElementById("refresh").classList.add("refresh_animate");
    setTimeout(() => {
        document.getElementById("refresh").classList.remove("refresh_animate");
    }, 1000);


}

/**
 * Center current bus to the center of the map
 */
function centerCurrentBus(){
    if (currentBusId){
        let currentBus = busi[currentBusId];
        let currentBusCoordinates = [currentBus.lat, currentBus.long];
        mymap.flyTo(currentBusCoordinates);
    }
}




gumbiZaRelacije = document.getElementById("gumbiZaRelacije");

/**
 * Draw favorite relation buttons
 * @param {*} gumbi Array of all buttons
 */
function izrisiRelacijskeGumbe(gumbi) {
    gumbiZaRelacije.innerHTML = "";
    // <button type="button" style="height:2em; width:fit" onclick="zahtevaj_relacijo_vsi_peroni(start=[11, 121, 500], cilj=[30001, 6642]);">OJPP Geoss–Lj</button>

    for(let [ime, relacija] of gumbi) {
        let btn = document.createElement("span");
        btn.type = "span";
        btn.onclick = () => {
            zahtevaj_relacijo_vsi_peroni(start=relacija.start, cilj=relacija.cilj);
            lastRelation = [relacija.start, relacija.cilj];
            allBuses = false;
            brisiMarkerje();
            menuClose();
        }

        //Use eventListener so touch computer can use it
        btn.addEventListener('touchstart', startTouch);
        btn.addEventListener('touchend', endTouch);

        //For non-touch devices
        btn.addEventListener('mousedown', startTouch);
        btn.addEventListener('mouseup', endTouch);

        var timeout;
        function startTouch(){
            timeout = setTimeout(() => {
                btn.remove();
                data.delete(ime);
                st.setItem(SAVENAME, JSON.stringify([...data]));
            }, 2000);    
        }
        
        function endTouch(){
            clearTimeout(timeout);
        }

        btn.innerText = ime;
        btn.classList.add("btn_busline");
        gumbiZaRelacije.appendChild(btn);
    }
}
    



const SAVENAME = "busi_shranjene-relacije";

// First, we test if there are already any presets saved.
const st = localStorage;
data = new Map(JSON.parse(st.getItem(SAVENAME))); // We use maps to maintain order
if (data.size) {
    izrisiRelacijskeGumbe(data);
}

function shraniRelacijo(start, cilj, ime) {
    data.set(ime, {"start": start, "cilj": cilj});
    st.setItem(SAVENAME, JSON.stringify([...data]));
    izrisiRelacijskeGumbe(data);
}

function exportPresets() {
    // Export presets to a file
    let file = new Blob([JSON.stringify([...data])], {type: "application/json"});
    let a = document.createElement("a");
    a.href = URL.createObjectURL(file);
    a.download = `busi_${(new Date()).getTime()}.json`;
    a.click();
}


/**
 * Obtain all trips on a stop
 * Obtains all trips for a certain stop in a certain time frame.
 * @param {*} stop_id ID of the bus stop
 * @param {*} period Time frame
 * @returns Array of trips
 */
async function tripsOnStop(stop_id, period){
    trips = await fp(`https://ojpp.si/api/stop_locations/${stop_id}/arrivals`);

    //return trips;
    //Log just trips that are comming in the next hour
    trips  = (trips.filter(trip => (new getTimeAsDate(trip?.time_departure ?? "-24:01:01") - new Date()) < period*60*1000 && (new getTimeAsDate(trip?.time_departure ?? "-24:01:01") - new Date()) > 0));
    return trips;

}

/**
 * Display trips on bus stop
 * Displays all trips on the selected bus stop in the timetable section. Calculates time upon arrival and live status.
 * @param {*} stopid ID of the bus stop
 * @param {*} period Time frame
 */
async function displayTripsOnStop(stopid, period = 60){
    filtered = await tripsOnStop(stopid, period);

    //Display the trips
    TIMETABLE.innerHTML = `
    <thead><tr><td>Linija</td><td style='padding-right:30px'>Prihod</td></tr></thead>`;
    for(let t of filtered){ 

        //Check if the trip is older than 15 minutes
        date = new Date;
        hour = date.getHours();
        minute = date.getMinutes();

        let tr = document.createElement("tr");
        //Unique id for the row
        tr.id = t.trip_id;
      
        let td = document.createElement("td");
        let a = document.createElement("a");
        a.href = `https://ojpp.si/trips/${t?.["trip_id"]}`;
        a.target = "_blank";
        a.innerText = t.route_name.trim();
        td.style.paddingLeft = "15px";
        td.style.width = "70%";
        td.appendChild(a);
        tr.appendChild(td);
        td = document.createElement("td");

        //Calculate the time difference
        minToArrival = ((new Date(`${danes}T${t.time_departure ?? t.time_arrival}`) - new Date()) / 60000).toFixed(0);

        if(minToArrival < 60){
            td.innerText = `${minToArrival} min`;
        }
        else{
            td.innerText = `${t.time_departure.slice(0,5)}`;
        }
        td.style.paddingRight = "30px";
        tr.appendChild(td);

        if(t?.vehicle?.id) {
            let span = document.createElement("span");
            span.classList.add("material-symbols-outlined");
            span.classList.add('busLive');
            span.innerText = "sensors";
            td.appendChild(span);
            tr.dataset.busid = t.vehicle.id;
            tr.classList.add("tripLive");
            tr.addEventListener("click", function(e) {
                // only if not a
                if(e.target.tagName !== "A") m2[t.vehicle.id]?.openPopup();
            });
        }
        TIMETABLE.appendChild(tr);
    }
    //Hide no line warning
    document.getElementById("timetable_no_line").classList.add("no");
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
