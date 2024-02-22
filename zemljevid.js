const ZAPADLOST = 1000 * 3600; // Kako stare avtobuse skrijemo (v milisekundah)

x = 46.051;
y = 14.505;
m2 = {}; // Markerji bodo zdaj kot key: value, kjer je key = vehicleId in value = marker
m3 = {}; //Marjerki za orientacijo


/* IKONE */
var busIcon = L.icon({
    iconUrl: 'bus.svg',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
});
var busIconLpp = L.icon({
    iconUrl: 'lpp_bus.svg',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -26]
});
var busIconGood = L.icon({
    iconUrl: 'bus_good2.svg',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -34]
}); 

var busIconKrsiDekret = L.icon({
    iconUrl: 'bus_krsiDekret.svg',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -34]
}); 

var myIconlocation = L.icon({
    iconUrl: 'location_accent-01.svg',
	iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [-3, -76]
});

var busDirection = L.icon({
    iconUrl: 'bus_arrow.svg',
	iconSize: [45, 45],
    iconAnchor: [22.5, 22.5],
    popupAnchor: [0, -14]
});

/* ZEMLJEVID */
var mymap = L.map('mapid', {
    zoomControl: false
}).setView([x, y], 13);
L.maptilerLayer({
    apiKey: "Iz6oqHAlxuXztN4SolAF"
}).addTo(mymap);
L.tileLayer("", {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, data from <a href="https://ojpp.si">OJPP (CC BY 4.0)</a>',
    maxZoom: 18,
}).addTo(mymap);
/* L.control.attribution({
    position: 'topright'
}).addTo(mymap);
 */
/* LOKACIJA */
var radius, myLocation, myAccuracy;
mymap.locate({
    setView: false,
    maxZoom: 16,
    watch: true
});
function onLocationFound(e) {
    var radius = e.accuracy / 2;
    var color = 'var(--color-primary';
    if (!myLocation) {
        myLocation = L.marker(e.latlng, {
            icon: myIconlocation
        }).addTo(mymap);
        myAccuracy = L.circle(e.latlng, radius, {fillColor: color, color:color}).addTo(mymap);
        mymap.flyTo(e.latlng, 13)
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
animiraj = function(enMarker, newx, newy) {
    var p = 0; // potek interpolacije

    var x = enMarker.getLatLng().lat;
    var y = enMarker.getLatLng().lng;

    var pr = setInterval(function() {
        if (p < 1) {
            enMarker.setLatLng(new L.LatLng(cosp(x, newx, p), cosp(y, newy, p)));
            p += 0.1;
        } else {
            x = newx;
            y = newy;
            clearInterval(pr);
        }
    }, 0);
}

update_smer = function(enMarker, newx, newy, newbear) {
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
    
    
    console.log(enMarker._icon.style.transform);
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
function starost(tstamp, vid) {
	//console.log(tstamp, vid);
	let d = new Date();
	let output = "";
	let razmak = (d - new Date(tstamp));
	//console.log(razmak);
	
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
        console.log("Napaka pri izpisu starosti: ", e);
        clearInterval(odstevalci.pop());    
    }
	return output;
}

odpriMaps = function(bus) {
    b = m2[bus].getLatLng();
    dest = eval(document.querySelector("input[name='cilj']:checked").value);
    window.open("https://www.google.com/maps/dir/?api=1&origin=" + b.lat + "%2C" + b.lng + "&destination=" + dest.lat + "%2C" + dest.lng + "&travelmode=driving");
}

brisiMarkerje = function() {
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


function izrisi_OJPP(odg) {
	console.log("Risanje OJPP", busi);
    myIcon = busIcon;

	d = new Date(); // Uporabimo kasneje za skrivanje starih busov

    if(Object.keys(busi).length === 0) {
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
        var x = odg["lat"];
        var y = odg["long"];
        var vozilo = odg["vehicle_id"];
        var bear = odg["direction"];

        if(x === undefined || y === undefined) {
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
                icon: myIcon
            }).addTo(mymap);
        }
        

        // Tukaj preverimo, katere stare buse bomo skrili z mape.
        busTstamp = new Date(odg["time"]);
        
        if (!document.getElementById("prikazujStareBuse").checked && d - busTstamp > ZAPADLOST) {
            mymap.removeLayer(m2[vozilo]);
            delete m2[vozilo];
            continue;
        }
        // Konec preverjanja za skrivanje starih busov.

        if (odg["vehicle_id"] === null) {
			// Bus nima ID-ja, ignoriramo.
        } else {
            lng = y;
            lat = x;
            bear = odg["direction"];
            speed = odg?.["vehicleSpeed"] ?? `<span style="font-size: xx-small;">${odg?.["operator_name"]}</span>` ?? "🤷🏻‍♀️";
            vid = odg["vehicle_id"];
            timeDeparture = odg?.["time_departure"] ?? "";
            timeArrival = odg?.["prihodNaCilj"] ?? "";


            vsebina = "";
            vsebina += `
                <div style="padding-left: 10px; padding-top: 10px;">
                <span class="material-symbols-outlined" style="font-size: 2em; transform:translate(0,0.25em); z-index:100; color:var(--color-primary)" onclick="mymap.closePopup()">arrow_back</span>
                <span class="popup-relacija">${odg?.["route_name"]}</span>
                <div style="position:relative; left: 40px;">
                    <span class="bus_info"><span class='popup_id' style='user-select: text'>Številka avtobusa: ${vid} </span></span>
                
            `;

            //Do not display if undefined
            
            if (timeDeparture != "" || timeArrival != "") {
                vsebina += `<br><span class="bus_info">Urnik za relacijo: ${timeDeparture}–${timeArrival}</span>`;
                vsebina += `<br><span class="bus_info"><b style='user-select: text'>${odg["plate"]}</b></span>`;

            }

            vsebina += (`<div class="popup_zamuda" style="width:fit-content;"><span class='popup_zamuda_button' onclick='izpisi_zamudo2(this,${vid})' style="width:fit-content; margin-left:-10px">Kolikšna je zamuda?</span></div>`); //ZAMUDA

            vsebina +=` 
                </div>
            </div>`;
            vsebina += ("<br><span style='color: gray;font-size: 80%;bottom: 10%;right: 10%;' id='stamp_" + vid + "'><i>Nazadnje posodobljeno " + busTstamp + "</i></span><br>"); //TIMESTAMP (kmalu depreciated, ko bo STAROST)
            vsebina += ("<img id='eksekuter' src='' onerror='console.log(\"test\"); for(let i = 0; i < odstevalci.length; i++) {clearInterval(odstevalci.pop());} odstevalci.push(setInterval(starost, 1000, \"" + busTstamp + "\", \"" + vid + "\")); document.getElementById(\"stamp_" + vid + "\").style.position = \"absolute\"; starost(\"" + busTstamp + "\", \"" + vid + "\"); this.remove();'/>");


            m2[vozilo].bindPopup(vsebina);

            m2[vozilo].on('popupopen', function() {
                document.getElementById('delay_relation').innerText = odg["route_name"];
                document.getElementById('delay_container').classList.add('no');
                menuClose();
                
                //Zoom in on bus location
                mymap.flyTo([odg["lat"],odg["long"]], 15 );

            });

            m2[vozilo].on('popupclose', function() {
                hideDelays();
                //Zoom out
                mymap.flyTo([odg["lat"],odg["long"]], 12);
            });

            m2[vozilo]["busTstamp"] = busTstamp;
            m3[vozilo]["busTstamp"] = busTstamp;

            animiraj(m2[vozilo], lat, lng);
            update_smer(m3[vozilo], lat, lng, bear);
            outdejtajBus(vozilo);

        }



    }
	
}



function outdejtajBuse() {
    for(let m in m2) {
        outdejtajBus(m);
    }
    for(let m in m3) {
        outdejtajBus(m);
    }
}
function outdejtajBus(m) {
    let outdejtanost = clamp((((new Date()) - (new Date(m2[m]["busTstamp"])))/1000 - 90)/300, 0, 1); // New data arrives every 30 seconds, and is 60 seconds old. Fade out the marker slowly for 5 minutes.
    console.log(outdejtanost);
    m2[m]["_icon"]["style"]["filter"] = `grayscale(${lerp(0, 89, outdejtanost)}%) blur(${lerp(0, 0.07, outdejtanost)}rem) opacity(${lerp(100, 65, outdejtanost)}%)`
    //m2[m]["_icon"]["style"]["filter"] = `grayscale(${lerp(0, 100, outdejtanost)}%) opacity(${lerp(100, 65, outdejtanost)}%)`
}

let outdejtanje = setInterval(outdejtajBuse, 20000);

var zadnjiIskaniBusId = "";
async function iskalnikBusId() {
    zadnjiIskaniBusId = prompt("Vnesi ID avtobusa", zadnjiIskaniBusId);

    //Wait for busses to load
    await godusModus();
    m2[zadnjiIskaniBusId].openPopup();
}