//Force close on new load
menuClose();

//If stop is selected
selectedStop = 0;


var infoTimeout;

/**
 * Function to toggle the info container
 */
function toggleInfo() {
    var element = document.getElementById('info');
    element.classList.toggle('closed');
    
    clearTimeout(infoTimeout);
    if (element.classList.contains('closed')){
        fadeIn('info', 100);
    }
    else{
        infoTimeout = fadeOut('info', 100);
    }

}

/**
 * Function to close the menu/scrollable site container
 */
function menuClose(){
    setTimeout(function() {
        var element = document.getElementById('menu');
        window.scrollTo({top: 0, behavior: 'smooth'});
    }, 100); // Adjust the delay (in milliseconds) to make it slower
}

/**
 * Function to open the menu/scrollable site container
 */
function menuOpen(){
    setTimeout(function() {
        var element = document.getElementById('menu');
        element.scrollIntoView({behavior: "smooth", block: "start", inline: "nearest"});
    }, 100); // Adjust the delay (in milliseconds) to make it slower
}

/**
 * Open menu and show delays    
 * It is used to show only delays after then button is pressed on viechle popup
 */
function delayOpen(){
    setTimeout(function() {
        var element = document.getElementById('delay_container')
        var elementTimetable = document.getElementById("timetable_container");
        var elementFavorite = document.getElementById("favorites");

        elementTimetable.classList.add("no");
        elementFavorite.classList.add("no");
        element.scrollIntoView({behavior: "smooth", block:"end", inline:"nearest"})
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
        if (!elementMenu.classList.contains("closed")){
            menuClose();
            setTimeout(function() {
            elementFavorite.classList.remove("no");
            elementTimetable.classList.add("no");
            elementDelay.classList.add("no");
            }, 800);
            setTimeout(() => {
                menuOpen();
            }, 1000);
        }
        else{
            elementFavorite.classList.remove("no");
            elementTimetable.classList.add("no");
            elementDelay.classList.add("no");
            setTimeout(() => {
                menuOpen();
            }, 100);
        }
        elementMenu.classList.remove("closed");
            
        
    }
    else{toggleMenu();}
    
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

var searchTimeout;
/**
 * Toggle search container
 * Enables searching for bus stops. If the search container is already displayed, it will close it.
 */
async function toggleSearch(){
    var element = document.getElementById("search_container");
    element.classList.toggle("closed");

    clearTimeout(searchTimeout);
    if (element.classList.contains("closed")){
        fadeIn('search_container', 100);
        document.getElementById("search_field").focus();
    }
    else{
        searchTimeout = fadeOut('search_container', 100);
    }

    if(Object.keys(postajalisca).length === 0) {
        await zahtevaj_vsa_postajalisca();
        const event = new Event("input");
        document.getElementById("search_field").dispatchEvent(event);
    }
}

var search_results = document.getElementById("search_results");
/**
 * Update search results 
 * Updates the search results based on the input in the search field (live search)
 * @param {*} e Current search input
 */
function updateSearch(e){
    console.log(e);
    let query = e.target.value;
    console.log(query);
    search_results.innerHTML = "";
    if (query.length >= 3){
        let postaje = Object.keys(postajalisca).filter(p => p.toLowerCase().includes(query.toLowerCase()));
        for(let p of postaje){
            let li = document.createElement("li");
            li.innerHTML = p;
            li.dataset.imePostaje = p;
            search_results.appendChild(li);
        }
    }
}

search_results.addEventListener("click", function(e){
    console.log(e);
    if (e.target.tagName === "LI"){
        prikaziPostajiNaZemljevidu(e.target.dataset.imePostaje);
    }
});

/**
 * Show relavant stops on the map
 * Based on the selected search input item it will show all relavant stops on the map so the appropriate one can be selected.
 * @param {*} imePostaje Stop name as in the search results
 */
function prikaziPostajiNaZemljevidu(imePostaje) {
    console.log(imePostaje);
    idsPostaj = postajalisca[imePostaje];
    // get object from data_postajalisca which has the same id as the one in idsPostaj
    for (let i = 0; i < idsPostaj.length; i++) {
        let postaja = data_postajalisca.find(p => p.properties.id == idsPostaj[i]);
        console.log(postaja);
        if (postaja) {
            let lat = postaja.geometry.coordinates[1];
            let lon = postaja.geometry.coordinates[0];
            // Create a new marker with icon peron
            let marker = L.marker([postaja.geometry.coordinates[1], postaja.geometry.coordinates[0]], {icon: peronIcon}).addTo(mymap);
            let menuElement = document.getElementById('menu');

            //On popup open
            marker.on('popupopen', function() {
                selectedStop = postaja.properties.id;
                poglejOdhodeSTePostaje(postaja.properties.id);
                menuClose();
                menuElement.classList.add('closed');
                toggleTimetable();

                document.getElementById('timetable_title').innerHTML = postaja.properties.name;
                document.getElementById('timetable_warning').classList.add("no");
            });

            //On popup close
            marker.on('popupclose', function() {
                selectedStop = 0;
                menuClose();
                menuElement.classList.add('closed');
            });

            let vsebina = `<span style="color:var(--color-primary)">${postaja.properties.name}</span>`;
            marker.bindPopup(vsebina);
            // Fly to
            mymap.flyTo([lat, lon], 18, {duration: 0.5});
        }
    }
    toggleSearch();
}

/**
 * Wrapper function for the correct flow of showing only buses of this stop
 * @param {int} id id of the bus stop (properties.id)
 */
async function poglejOdhodeSTePostaje(id) {
    console.log(id);
    brisiMarkerje(); // We want to hide all other buses
    await displayTripsOnStop(id, 300);
    refresh(automatic=true);
}

document.getElementById("search_field").addEventListener("input", updateSearch);

/**
 * Toggle menu/site cointainer
 * It will close the menu/site container based on current state and position. If not fully closed it will open and not close.
 */
function toggleMenu() {
    
    var element = document.getElementById('menu');
    element.classList.toggle('closed');

    if (!element.classList.contains('closed') ){
        menuOpen();
    }
    else if (element.classList.contains('closed') && document.getElementById('menu').getBoundingClientRect().top == window.innerHeight - 120){
        menuOpen();
    }
    else{
        //Scroll to the top with animation
        menuClose();
    }
}

//Auto refresh every 20 seconds
setInterval(function(){
    refresh(automatic=true);
}, 20000);

//Handle offline situation
window.addEventListener('offline', function(event){
    console.log("offline");
    showOfflineWarning();
});

//Handle offline situation
window.addEventListener('online', function(event){
    console.log("online");
    hideOfflineWarning();
});

showOfflineWarning = function(){
    fadeIn("offline", 1000);
}

hideOfflineWarning = function(){
    fadeOut("offline", 1000);
}

/**
 * Hide delays information
 */
function hideDelays(){
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
async function pokaziVse() {
    //Search for all elements with class no zamude inside the zamudiceContainer
    let elements = [...document.getElementsByClassName("no zamude")];
    for(let e of elements) {
        e.classList.remove("no");
    }
    document.getElementsByClassName("btn_delay_more")[0].classList.add("no");
}

/**
 * Fade in selected element with animation
 * Animation fade in function for elements that need to be displayed over map so display:none must be present.
 * @param {*} elementID Id name of the element in HTML
 * @param {*} time Animation duration in miliseconds
 */
function fadeIn(elementID, time){
    var element = document.getElementById(elementID);
    element.style.transition = `opacity ${time/1000}s ease-in-out`;
    element.style.opacity = 0;
    element.classList.remove("no");
    setTimeout(function(){element.style.opacity = 0.95;}, 34);
}

/**
 * Fade out selected element with animation
 * Animation fade out function for elements that need to be displayed over map so display:none must be present.
 * @param {*} elementID Id name of the element in HTML
 * @param {*} time Animation duration in miliseconds
 * @returns 
 */
function fadeOut(elementID, time){
    var element = document.getElementById(elementID);
    element.style.opacity = 0;
    return setTimeout(function(){element.classList.add("no");}, time);
}