function toggleInfo() {
    var element = document.getElementById('info');
    element.classList.toggle('closed');

    if (element.classList.contains('closed')){
        fadeIn('info', 500);
    }
    else{
        fadeOut('info', 500);
    }

}


function menuClose(){
    setTimeout(function() {
        var element = document.getElementById('menu');
        window.scrollTo({top: 0, behavior: 'smooth'});
    }, 100); // Adjust the delay (in milliseconds) to make it slower
}

function menuOpen(){
    setTimeout(function() {
        var element = document.getElementById('menu');
        element.scrollIntoView({behavior: "smooth", block: "start", inline: "nearest"});
    }, 100); // Adjust the delay (in milliseconds) to make it slower
    return;
}

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
        }
        else{
            elementFavorite.classList.remove("no");
            elementTimetable.classList.add("no");
            elementDelay.classList.add("no");
        }

        setTimeout(() => {
            menuOpen();
        }, 1000);
        
    }
    else{toggleMenu();}
    
}

function toggleSearch(){
    var element = document.getElementById("search_container");
    element.classList.toggle("closed");

    if (element.classList.contains("closed")){
        fadeIn('search_container', 1000);
    }
    else{
        fadeOut('search_container', 1000);
    }

}


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


//Fade in and out functions

function fadeIn(elementID, time){
    var element = document.getElementById(elementID);
    element.style.transition = `opacity ${time/1000}s ease-in-out`;
    element.style.opacity = 0;
    element.classList.remove("no");
    setTimeout(function(){element.style.opacity = 0.95;}, 100);
}

function fadeOut(elementID, time){
    var element = document.getElementById(elementID);
    element.style.opacity = 0;
    setTimeout(function(){element.classList.add("no");}, time);
}