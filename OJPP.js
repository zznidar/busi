//const ENDPOINT = "../";
var noLoaders = 0;
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


async function zahtevaj_voznje(postajalisca) {
    let requesti = [];
    for(let p of postajalisca) {
        //requesti.push(fp(`${ENDPOINT}posodobi-ojpp.php?postaja=${p}`));
        requesti.push(fp(`https://ojpp.si/api/stop_locations/${p}/arrivals`));
    }
    let tripsi = (await Promise.all(requesti)).flat();
    console.log("Tripsi", tripsi);
    return tripsi;
}

async function zahtevaj_relacijo_vsi_peroni(start, cilj) {
    [trips_start, trips_cilj, data_buses] = await Promise.all([
        zahtevaj_voznje(start),
        zahtevaj_voznje(cilj),
        (await zahtevaj_buse())["features"]
    ]);

    console.log(start, cilj)
    console.log(trips_start, trips_cilj, data_buses);

    trips = trips_start.filter(trip => trips_cilj.some(trip2 => trip.trip_id === trip2?.trip_id && (trip.time_departure ?? trip.time_arrival) < (trip2?.time_departure ?? trip2?.time_arrival)
    &&
    ((trip.prihodNaCilj = (trip2?.time_arrival ?? trip2?.time_departure)) || true)
    ));
    // Tale gornja kolobocija je zato, da v trip zapišemo še urnični prihod na ciljno postajo.
    console.log(trips);

    // Get only buses which share trip_id
    buses = data_buses.filter(bus => trips.some(trip => trip.trip_id === bus.properties.trip_id));
    console.log(buses);


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


async function zahtevaj_buse() {
    return fp(`https://ojpp.si/api/vehicle_locations`);
}

// File test2.js je nujno potreben za izris.

danes = new Date().toISOString().slice(0,10);
NA_POSTAJALISCU_THRESHOLD = 100; // metres
async function zahtevaj_zamudo(busId) {
    // https://ojpp.si/api/vehicles/BUSID/locations_geojson/?date=2023-11-18 BUSID
    // /api/trips/TRIP_ID/details/ TRIP_ID, ki je zapisan v objektu busi
    /* for i od zadaj:
        if geometry -> coordinates od location tracka je znotraj posamezne postaje:
            primerjaj urnik in gps track
    */
    danes = new Date().toISOString().slice(0,10);
    location_track = (await fp(`https://ojpp.si/api/vehicles/${busId}/locations_geojson/?date=${danes}`))["features"];
    trip_details = (await fp(`https://ojpp.si/api/trips/${busi[busId]["trip_id"]}/details/`))["stop_times"];
    console.log(location_track, trip_details);
    let odhodSPrvePostaje = new Date(`${danes}T${trip_details[0]["time_departure"]}:00`);
    let zamude = [];
    //TODO: Vzamemo samo tracking točke, ki vsebujejo trip_id, za katerega računamo zamudo. Na ta način se losamo raznih "Ljubljana Tivoli: --54 min", ko se je še peljal na šiht.
        // Possible problem: Včasih bus nima pravilno vnesenega trip_id-ja (ampak potem se tudi na zemljevidu ne pojavi. To bi bil problem le v GodModusu)
    for(let t = location_track.length-1; t >= 0; t--) {
        let busLatLng = [location_track[t].geometry.coordinates[1], location_track[t].geometry.coordinates[0]];
        //console.log("busLatLng", busLatLng);
        for(let p = 0; p < trip_details.length; p++) {
            let stopLatLng = [trip_details[p]["stop"]["location"]["lat"], trip_details[p]["stop"]["location"]["lon"]];
            //console.log("stopLatLng", stopLatLng, "; ", mymap.distance(busLatLng, stopLatLng));
            if(mymap.distance(busLatLng, stopLatLng) < NA_POSTAJALISCU_THRESHOLD) {
                console.log("Je blizu postaje", trip_details[p]);
                let busJeBil = new Date(location_track[t].properties.time);
                let uraOdhodaISO = `${danes}T${trip_details[p]["time_departure"] ?? trip_details[p]["time_arrival"]}:00`;
                let busJeMoralBiti = new Date(uraOdhodaISO);
                let postaja = trip_details[p]["stop"]["name"];
                console.log(uraOdhodaISO);
                console.log("busJeBil", busJeBil, "busJeMoralBiti", busJeMoralBiti);
                let zamuda = Math.round((new Date(location_track[t].properties.time) - new Date(uraOdhodaISO)) / 60000);
                console.log("Zamuda", zamuda, "na postaji", postaja);
                zamude.push({postaja: postaja, zamuda: zamuda});

                // Remove this and all next stops from trip_details because zamuda was already calculated
                trip_details.splice(p, trip_details.length - p);
                
                // Remove this stop from trip_details because zamuda was already calculated
                //trip_details.splice(p, 1);

                //console.log("trip_details", trip_details);
                if(busJeBil < odhodSPrvePostaje) {
                    console.warn("Prehiteli smo samega sebe.", busJeBil, odhodSPrvePostaje);
                    return zamude;
                }
            }
        }
    }
    return zamude;
}

async function izpisi_zamudo(gumb, busId, stPostaj = 5) {
    console.log("This", gumb);
    let zamudiceContainer = gumb.nextElementSibling;
    console.log(zamudiceContainer);
    let zamude = await zahtevaj_zamudo(busId);
    console.log(zamude);
    let zamudeHTML = "";
    let items = 0;
    for(let z of zamude) {
        let barva = z.zamuda <= 0 ? "#3a4d39" : "#820300";
        
        if(zamudeHTML === "") {
            zamudeHTML += `<summary><span style='
            color: ${barva};
            padding: 1px 8px 1px 8px;
            margin-right:0.2rem;
            border: 2px solid ${barva};
            border-radius: 1rem;
            width: fit-content;
            display: inline-block;'>${z.zamuda} min</span>&nbsp${z.postaja} ${(z.zamuda > 3 || z.zamuda < -1) ? ' <span class="pritozba">Pritoži se na tramvaj komando</span>' : ""}</summary><ul>`;
            // Če je zamuda > 3 min ali spelje prej kot –1 min, dodamo gumb za pritožbo na tramvaj komando (https://fran.si/iskanje?View=1&=&Query=tramvaj)
            continue;
        }
        items++;
        zamudeHTML += `<li class=" ${(items > stPostaj) ? 'no zamude' : ''} "><span style="
        color: ${barva};
        padding: 1px 8px 1px 8px;
        margin-top:0.2rem;
        margin-right:0.2rem;
        border: 1px solid ${barva};
        border-radius: 1rem;
        width: fit-content;
        display: inline-block;
        opacity: 0.7">${z.zamuda} min</span>&nbsp${z.postaja}</li>`;
    }
    zamudeHTML += "</ul>";
    if(items > stPostaj) zamudeHTML += "<a onclick = 'pokaziVse()' style='color:grey'>Pokaži vse postaje</a>"

    //Update the button text
    gumb.innerText = "Osveži zamude";
    zamudiceContainer.innerHTML = zamudeHTML;

}

async function izpisi_zamudo2(gumb, busId, stPostaj = 5) {
    console.log("This", gumb);
    let zamudiceContainer = document.getElementById("zamudiceContainer");
    console.log(zamudiceContainer);
    let zamude = await zahtevaj_zamudo(busId);
    console.log(zamude);
    let zamudeHTML = "";
    let items = 0;


    for(let z of zamude) {
        let barva = z.zamuda <= 0 ? "var(color-secondary)" : "var(--color-delay)";



        
        if(zamudeHTML === "") {
            zamudeHTML += `
                <div class="zamuda_entry first">
                    <span class="material-symbols-outlined ${z.zamuda <= 0 ? "green" : "red"}" style="font-size: 1.1em; transform:translate(0.075rem,0.35em); position:absolute; z-index:100; color:var(--color-primary)">directions_bus</span>
					<span class="zamuda_line ${z.zamuda <= 0 ? "green" : "red"}" style="height:2.5rem; margin-top:-0.5rem"></span>
					<span class="dot big ${z.zamuda <= 0 ? "green" : "red"}"></span>
					<span class="postaja" style="margin-left:-0.5rem">${z.postaja}</span>
					<span class="zamuda ${z.zamuda <= 0 ? "green" : "red"}" style="padding-top:0.5rem">${z.zamuda} min</span>
				</div>
            `// Če je zamuda > 3 min ali spelje prej kot –1 min, dodamo gumb za pritožbo na tramvaj komando (https://fran.si/iskanje?View=1&=&Query=tramvaj)
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

    //Update the button text
    //zamudiceContainer.innerHTML = zamudeHTML;


    //Display delays in the page continer rather
    let delay_container = document.getElementById("delay_container");
    let delay_content = document.getElementById("delay_content");

    delay_content.innerHTML = zamudeHTML;
    delay_container.classList.remove("no");
    delayOpen();




}

function hideDelays(){
    menuClose();
    //Wait for the animation to finish
    setTimeout(() => {
        document.getElementById("delay_container").classList.add("no");
    }, 500);
    
}



async function pokaziVse() {
    //Search for all elements with class no zamude inside the zamudiceContainer
    let elements = [...document.getElementsByClassName("no zamude")];
    console.log(elements);
    for(let e of elements) {
        e.classList.remove("no");
        console.log(elements);
    }
    document.getElementsByClassName("btn_delay_more")[0].classList.add("no");
}

TIMETABLE = document.getElementById("timetable");
async function izpisi_urnik(trips) {
    TIMETABLE.innerHTML = "<thead><tr><td>Ura</td><td>Linija</td><td>Trajanje</td><td>Prevoznik</td></tr></thead>";
    for(let t of trips) {

        console.log(t);
        

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
function toggleTimetable() {
		
    var elementFavorite = document.getElementById("favorites");
    var elementTimetable = document.getElementById("timetable_container");
    var elementMenu = document.getElementById("menu");
    var elementDelay = document.getElementById("delay_container");
    var delayContent = document.getElementById("delay_content");

    //If favorite is visible, close menus, change visibilites and toggle menu
    if (elementTimetable.classList.contains("no")) {
        console.log("Showing timetable");
        if (!elementMenu.classList.contains("closed")) {
            menuClose();
            setTimeout(() => {
                elementTimetable.classList.remove("no");
                elementFavorite.classList.add("no");

                if(delayContent.innerHTML!='\n\t\t\t'){
                    elementDelay.classList.remove("no");
                }

            }, 800);
            setTimeout(() => {
                menuOpen();
            }, 1000);
        }
        else{
            elementTimetable.classList.remove("no");
            elementFavorite.classList.add("no");
            if(delayContent.innerHTML!='\n\t\t\t'){
                elementDelay.classList.remove("no");
            }
            setTimeout(() => {
                menuOpen();
            }, 100);
        }
        elementMenu.classList.remove("closed");
        
    }
    else{
    toggleMenu();
    }
}



//Check if bus is deleted
// Function to check if the element with ID "DELETED" exists on the target website

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

async function zahtevaj_vsa_postajalisca() {
    data_postajalisca = (await fp(`https://ojpp.si/api/stop_locations`))["features"];
    for(let p of data_postajalisca) {
        let name = p.properties.name;
        postajalisca?.[name]?.push(p.properties.id) ?? (postajalisca[name] = [p.properties.id]);
    }
    //dodajPostaje();
    return;
}

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
                    console.log(vstopnaPostaja, izstopnaPostaja);
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
async function refresh(automatic=false) {
 
    await godusModus(automatic);
    setTimeout(centerCurrentBus, 50);
 
    document.getElementById("refresh").classList.add("refresh_animate");
    setTimeout(() => {
        document.getElementById("refresh").classList.remove("refresh_animate");
    }, 1000);
    

}

function centerCurrentBus(){
    if (currentBusId){
        let currentBus = busi[currentBusId];
        let currentBusCoordinates = [currentBus.lat, currentBus.long];
        mymap.flyTo(currentBusCoordinates);
    }
}




gumbiZaRelacije = document.getElementById("gumbiZaRelacije");
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


async function tripsOnStop(stop_id, period){
    trips = await fp(`https://ojpp.si/api/stop_locations/${stop_id}/arrivals`);

    //return trips;
    //Log just trips that are comming in the next hour
    filtered  = (trips.filter(trip => (new getTimeAsDate(trip?.time_departure ?? "-24:01:01") - new Date()) < period*60*1000 && (new getTimeAsDate(trip?.time_departure ?? "-24:01:01") - new Date()) > 0));
    return filtered;

}

async function displayTripsOnStop(stopid, period = 60){
    filtered = await tripsOnStop(stopid, period);

    //Display the trips
    TIMETABLE.innerHTML = "<thead><tr><td>Linija</td><td>Prihod</td></tr></thead>";
    for(let i in filtered){ 

        t = filtered[i];
        console.log(t);
        

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
        td.appendChild(a);
        tr.appendChild(td);
        td = document.createElement("td");
        td.innerText = `${((new Date(`${danes}T${t.time_departure ?? t.time_arrival}`) - new Date()) / 60000).toFixed(0)} min`;
        tr.appendChild(td);
        TIMETABLE.appendChild(tr);
    }

    //Hide no line warning
    document.getElementById("timetable_no_line").classList.add("no");
}


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
