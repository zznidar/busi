const ZAPADLOST = 5000 * 3600; // Kako stare avtobuse skrijemo (v milisekundah)

x = 46.051;
y = 14.505;
m2 = {}; // Markerji bodo zdaj kot key: value, kjer je key = vehicleId in value = marker
m3 = {}; //Marjerki za orientacijo

currentBusId = 0;

if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    // dark mode
    busIconSrc = "bus_dark.svg";
    busDirectionSrc = "bus_arrow_dark.svg";
    mapStyle = "streets-v2-dark";
    document.querySelector('meta[name="theme-color"]').setAttribute('content', '#213545'); // Not sure if all browsers support media query in html meta tag
} else {
    busIconSrc = "bus.svg";
    busDirectionSrc = "bus_arrow.svg";
    mapStyle = "streets";
}


/* IKONE */
var busIcon = L.icon({
    
    iconUrl: busIconSrc,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
});


var myIconlocation = L.icon({
    iconUrl: 'location_accent-01.svg',
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
    iconUrl: 'postaja.png',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
});

/* ZEMLJEVID */
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

// To reinitiate: testiram._initMaptilerSDK(); // But this causes the tiles to disappear and load again (takes a few seconds)

// All external links should be opened in a new tab
[...mapid.getElementsByTagName("a")].forEach(a => a.target != "_blank" ? a.target = "_blank" : undefined)

L.tileLayer("", {
    attribution: '',
    maxZoom: 18,
}).addTo(mymap);  

/* L.control.attribution({
    position: 'topright'
}).addTo(mymap);

/* LOKACIJA */
var radius, myLocation, myAccuracy;
mymap.locate({
    setView: false,
    maxZoom: 16,
    watch: true
});

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
        myAccuracy = L.circle(e.latlng, radius, {fillColor: color, color:color}).addTo(mymap);
        mymap.flyTo(e.latlng, 13, {duration: 0.5})
    } else {
        animiraj(myLocation, e.latlng.lat, e.latlng.lng);
        animiraj(myAccuracy, e.latlng.lat, e.latlng.lng);
        myAccuracy.setRadius(radius);
    }
    xy = e.latlng;
}
mymap.on('locationfound', onLocationFound);
function onLocationError(e) {
    //alert(e.message);
}
mymap.on('locationerror', onLocationError);


/* REQUESTI */
/* ANIMACIJE */

/**
 * Animate bus markers
 * @param {*} enMarker Leaflet marker
 * @param {*} newx new latitude
 * @param {*} newy new longitude
 */
function animiraj(enMarker, newx, newy) {
    var p = 0; // potek interpolacije

    var x = enMarker.getLatLng().lat;
    var y = enMarker.getLatLng().lng;

    var pr = setInterval(function() {
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
function update_smer(enMarker, newx, newy, newbear) {
    var p = 0; // potek interpolacije

    var x = enMarker.getLatLng().lat;
    var y = enMarker.getLatLng().lng;
    var pr = setInterval(function() {
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

rotirajPopup = function() {
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

/* CASOVNIK */
odstevalci = [];

/**
 * Calculate how old the bus is
 * @param {*} tstamp timestamp
 * @param {*} vid ID of the bus
 * @returns 
 */
function starost(tstamp, vid) {
	let d = new Date();
	let output = "";
	let razmak = (d - new Date(tstamp));
	
	if(razmak >= 1000*3600*24) {
		output += (Math.floor(razmak/1000/3600/24) + "d ");
		razmak %= (1000*3600*24);
	}

	if(razmak >= 1000*3600) {
		output += (Math.floor(razmak/1000/3600) + "h ");
		razmak %= (1000*3600);
	}

	if(razmak >= 1000*60) {
		output += (Math.floor(razmak/1000/60) + "min ");
		razmak %= (1000*60);
	}

	output += (Math.floor(razmak/1000) + "s");
	razmak %= (1000);

    // Remove odštevalec if the popup is not open anymore
    try {
        document.getElementById("stamp_" + vid).innerText = output;
    } catch (e) {
        clearInterval(odstevalci.pop());    
    }
	return output;
}

odpriMaps = function(bus) {
    b = m2[bus].getLatLng();
    dest = eval(document.querySelector("input[name='cilj']:checked").value);
    window.open("https://www.google.com/maps/dir/?api=1&origin=" + b.lat + "%2C" + b.lng + "&destination=" + dest.lat + "%2C" + dest.lng + "&travelmode=driving");
}

/**
 * Remove Leaflet markers from map
 */
function brisiMarkerje() {
    for (const [key, value] of Object.entries(m2)) {
        mymap.removeLayer(m2[key]);
        delete m2[key];
    }
    for (const [key, value] of Object.entries(m3)) {
        mymap.removeLayer(m3[key]);
        delete m3[key];
    }
    busi = {};
}

lastZoom = undefined;


/**
 * Add buses to map
 * Draws buses as Leaflet markers
 * @param {*} busi array of buses
 * @param {*} automatic true if automatic refresh
 * @returns 
 */
function izrisi_OJPP(busi, automatic=false) {
    myIcon = busIcon;

	d = new Date(); // Uporabimo kasneje za skrivanje starih busov

    if(!automatic && Object.keys(busi).length === 0) {
        //alert("Ni takih busov, vsaj ne na OJPP");
        //Get element with id 'non_existing'
        var errorPopup = document.getElementById("non_existing");

        //Increase opacity to 0.8 for 3 seconds with animation
        //Also remove the "no" class so display: none is removed and then add it back after 3 seconds
        errorPopup.style.opacity = 0;
        errorPopup.style.transition = "opacity 1s ease-in-out";
        errorPopup.classList.remove("no");
        setTimeout(function(){errorPopup.style.opacity = 0.8;}, 100);
        setTimeout(function(){errorPopup.style.opacity = 0;}, 3000);
        setTimeout(function(){errorPopup.classList.add("no");}, 4000);
        return;

    }
	
    for (const [busId, odg] of Object.entries(busi)) {
        //console.log(odg);
        var x = odg["lat"];
        var y = odg["lon"];
        var vozilo = odg["id"];
        var bear = odg["heading"];

        if(x === undefined || y === undefined) {
            alert(`A se to kdaj zgodi? Bus ${vozilo} nima koordinat: ${x}, ${y}`);
            // Bus nima koordinat, le izpišemo registrsko
            log.innerText += (`\n${vozilo}: ${odg["plate"]}, ${odg["route_name"]}, urnik: ${odg["time_departure"]}; model: ${odg?.["model"]?.["name"]}`);
            continue;
        }

        
        if (!m3[vozilo]) {
            m3[vozilo] = L.marker([x, y], {
                icon: busDirection,
            }).addTo(mymap);

            m3[vozilo]._icon.classList.add("rotated-marker");
            var oldTransform = m3[vozilo]._icon.style.transform;
            m3[vozilo]["_icon"].dataset.orientacija = bear;
            
        }
        if (!m2[vozilo]) {
            m2[vozilo] = L.marker([x, y], {
                icon: !(odg["trip_id"] === null && odg["route_id"] === null && odg["route_name"] === null) ? myIcon : peronIcon
            }).addTo(mymap);
        } else {
            m2[vozilo].off('popupopen');
        }
        

        // Tukaj preverimo, katere stare buse bomo skrili z mape.
        busTstamp = new Date(odg["timestamp"]*1000);
        //console.log(odg["timestamp"], busTstamp);
        
        if (!document.getElementById("prikazujStareBuse").checked && d - busTstamp > ZAPADLOST) {
            mymap.removeLayer(m2[vozilo]);
            mymap.removeLayer(m3[vozilo]);
            delete m2[vozilo];
            delete m3[vozilo];
            continue;
        }
        // Konec preverjanja za skrivanje starih busov.

        if (vozilo === null) {
			// Bus nima ID-ja, ignoriramo.
        } else {
            lng = y;
            lat = x;
            speed = odg?.["speed"] ?? `<span style="font-size: xx-small;">${odg?.["operator_name"]}</span>` ?? "🤷🏻‍♀️";
            timeDeparture = odg?.["time_departure"] ?? "";
            timeArrival = odg?.["prihodNaCilj"] ?? "";
            plate = odg?.["plate"] ?? "";
            plate = isNaN(plate[0]) ? `${plate.substr(0, 2)} ${plate.substr(2)}` : `${plate} (morda to ni prava registrska)`;


            vsebina = "";
            vsebina += `
                <div style="padding-left: 10px; padding-top: 10px;">
                <span class="material-symbols-outlined" style="font-size: 2em; transform:translate(0,0.25em); z-index:100; color:var(--color-primary)" onclick="mymap.closePopup()">arrow_back</span>
                <a href="https://api.beta.brezavta.si/trips/${encodeURIComponent(odg?.["trip_id"])}" target="_blank" class="popup-relacija">${odg?.["trip_headsign"]}</a>
                <div style="position:relative; left: 40px; max-width: calc(100% - 50px)">
                    <span class="bus_info"><span class='popup_id' style='user-select: text'>Številka avtobusa: ${vozilo} </span></span>
                    <span class="material-symbols-outlined share-button" style="color:var(--color-primary)" onclick="share('${vozilo}');">share</span><br>
                
            `;

            //Do not display if undefined
            
            if (timeDeparture != "" || timeArrival != "") {
                vsebina += `<br><span class="bus_info">Urnik za relacijo: ${timeDeparture}–${timeArrival}</span>`;
                
            }
            vsebina += `<br><span class="bus_info"><b style='user-select: text'>${plate}</b></span>`;
            vsebina += `<br><span class="bus_info">Prevoznik: ${odg?.["operator_name"]}</span>`;

            vsebina += (`<div class="popup_zamuda" style="width:fit-content;"><span class='popup_zamuda_button' onclick='izpisi_zamudo2(this,"${vozilo}")' style="width:fit-content; margin-left:-10px; opacity: 0.1" disabled>Zamude busov trenutno niso prikazane.</span></div>`); //ZAMUDA

            vsebina +=` 
                </div>
            </div>`;
            vsebina += ("<br><span style='color: gray;font-size: 80%;bottom: 10%;right: 10%;' id='stamp_" + vozilo + "'><i>Nazadnje posodobljeno " + busTstamp + "</i></span><br>"); //TIMESTAMP (kmalu depreciated, ko bo STAROST)
            vsebina += ("<img id='eksekuter' src='' onerror='for(let i = 0; i < odstevalci.length; i++) {clearInterval(odstevalci.pop());} odstevalci.push(setInterval(starost, 1000, \"" + busTstamp + "\", \"" + vozilo + "\")); document.getElementById(\"stamp_" + vozilo + "\").style.position = \"absolute\"; starost(\"" + busTstamp + "\", \"" + vozilo + "\"); this.remove();'/>");


            m2[vozilo].bindPopup(vsebina);

            m2[vozilo].on('popupopen', function() {
                document.getElementById('delay_relation').innerText = odg?.["route_name"];
                document.getElementById('delay_container').classList.add('no');
                menuClose();
              
                lastZoom = mymap.getZoom();
                //Zoom in on bus location
                mymap.flyTo([odg["lat"],odg["lon"]], Math.max(lastZoom, 15), {duration: 0.5});
                currentBusId = odg["id"];

                
                //Draw bus route
                if (odg["trip_id"] !== null) {
                    displayBusRoute(odg["id"]);
                }

                //Check if navigator.share is available, otherway set share-button to display: none
                if (typeof navigator.share !== 'undefined') {
                    document.getElementsByClassName("share-button")[0].style.display = "inline";
                }




            });

            m2[vozilo].on('popupclose', function() {
                hideDelays();
                //Zoom out
                mymap.flyTo([odg["lat"],odg["lon"]], Math.max(lastZoom, 12), {duration: 0.5});
                currentBusId = 0;
                document.getElementById("timetable_no_line").classList.remove("no");
                eraseGeometryOnMap();
            });

            m2[vozilo]["busTstamp"] = busTstamp;
            m3[vozilo]["busTstamp"] = busTstamp;

            animiraj(m2[vozilo], lat, lng);
            update_smer(m3[vozilo], lat, lng, bear);
            outdejtajBus(vozilo);

        }



    }
	
}


/**
 * Outdate all buses
 * Outdates leaflet markers
 */
function outdejtajBuse() {
    for(let m in m2) {
        outdejtajBus(m);
    }
    for(let m in m3) {
        outdejtajBus(m);
    }
}

/**
 * Outdate a bus
 * Outdates leaflet markers
 * @param {*} m leaflet marker
 */
function outdejtajBus(m) {
    let outdejtanost = clamp((((new Date()) - (new Date(m2[m]["busTstamp"])))/1000 - 90)/300, 0, 1); // New data arrives every 30 seconds, and is 60 seconds old. Fade out the marker slowly for 5 minutes.
    m2[m]["_icon"]["style"]["filter"] = `grayscale(${lerp(0, 89, outdejtanost)}%) blur(${lerp(0, 0.07, outdejtanost)}rem) opacity(${lerp(100, 65, outdejtanost)}%)`
}

let outdejtanje = setInterval(outdejtajBuse, 20000);

var zadnjiIskaniBusId = "";
/**
 * Search for a bus by ID
 */
async function iskalnikBusId() {
    zadnjiIskaniBusId = prompt("Vnesi ID avtobusa", zadnjiIskaniBusId);

    //Wait for busses to load
    await godusModus();
    m2[zadnjiIskaniBusId].openPopup();
}


var toastTT1, toastTT2, toastTT3;
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
    toastTT1 = setTimeout(function(){toast.style.opacity = 0.8;}, 100);
    toastTT2 = setTimeout(function(){toast.style.opacity = 0;}, 3000);
    toastTT3 = setTimeout(function(){toast.classList.add("no");}, 4000);
}