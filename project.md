# Project overview
This file is used for documentationi purposes of the project structure and used variables to showcase their purpose and to document everything needed for efficent project maintenance. 

## Project tree
The structure of the project is as followed:

    ├───graphics
    ├───images
    ├───scripts
    │   ├───api_calls.js
    │   ├───backend.js
    │   ├───busi-offline.js
    │   ├───map.js
    │   ├───sw.js
    │   ├───ui.js
    │   └───ZZ_leaflet.js
    ├───index.html
    ├───style.css
    └───manifest.webmanifest

**Scripts**<br>
*api_calls.js* - Contains all functions for obtaining data from external API endpoints. These are all `async function` functions. <br>
*backed.js* - Contains all functions for processing data needed for application working. <br>
*busi-offline.js* - (PWA) Contains functions for PWA app to be working properly offline. <br>
*map.js* - Contains functions for setting up and drawing markers on a Leaflet map. <br>
*sw.js* - (PWA) Service worker file for PWA app. <br>
*ui.js* - All functions for UI elements off the app (toogling, toast messages, etc.) <br>
*ZZ_leaflet.js* - Custom Leaflet wrapper.

## Global variables
Here all global variables with their descriptions are listed.

| **Variable name** | **Variable type** | **Description**                                                             |
|------------------ |-------------------|-----------------------------------------------------------------------------|
|`TIMEOUT`|`const int`|Time in milliseconds for how old buses to show on the map.|
|`SAVENAME`|`const string`|Name for localy saved bus lines.|
|`apiUrl` |`const string`| Base url for api calls. |
|`today`|`var string`|Current date parsed as string in format YYYYMMDD.|
|`todayISO`|`var string`|Current date parsed as string in ISO format YYYY-MM-DD.|
|`noLoaders`|`var int`| Count of active loaders. |
|`buses`|`var object`| Buses object containing data for all current buses.|
|`trips`|`var object`| Trips object containing data for all current trips.|
|`busStops`|`var object`|Bus stops object containing data for all currently processed bus stops.|
|`entryBusStop`|`list`|List of all entry point bus stops.|
|`exitBusStop`|`list`|List of all exit point bus stops.|
|`selectedStop`|`var string`|ID of currently selected stop.|
|`busStopsData`|`list`|List of bus stops with their respective IDs.|
|`lastRelation`|`list`|List of the last relation displayed/viewed.|
|`allBuses`|`boolean`|True if all buses should be displayed, false otherwise.|
|`currentBusId`|`var string`|ID of current selected bus.|
|`m2`|`var object`|Leaflet marker object for bus markers.|
|`m3`|`var object`|Leaflet marker object for bus direction markers.|
|`timers`|`list`|Timers for outdating buses.|
|`lastZoom`|`float`|Last zoom magnitude setting for leaflet.|
|`lastSearchedBusId`|`var string`|String of last bus ID that was searched for.|
|`currentPolyline`|`object`|Stores current polyline for the bus line displayed on leaflet map.|
|`currentStopsLayer`|`object`|Stores current markers that are displayed as bus stops along the polyline.|

## Key functionalities
> ### 1. View all buses
> If no trip is selected, all buses will display after first call of `refresh()` function. This mode can also be accessed by clicking the bus icon inside info panel menu. This is triggered by calling `showBuses()` (old `godusModus()`) function without any trips inside `trips` object.

>### 2. Add favourite bus lines
>One of key features of the app is adding custom faourite bus lines inside favourites panel of the app. Clicking a button *Dodaj relacijo* invokes a function `addBusStop()` that prompts user for entry point bus station at first, then lists all available options, then prompts for exit point bus station and lists all options. Upon completing the last selection the relation is added permanantly to the user favourites panel and saved localy. The relation can be removed by holding th button for three seconds. A click event is bound to the button, and will filter all trips to display only those that match the targeted bus line. Buses are displayed on the map, and `trips` object is updated, so from this point on the only these buses will be refreshed periodicaly. Also upon pressing the button the timetable for the relation will be generated. There the buses ranging from past hour till the end of the day are displayed, along with scheduled or actual departure time listed if available. Live buses gain a green border and special icon, so user can know that the bus can be live tracked. 

>### 3. Search bus stops
> Another way of interacting with current bus arrivals is to invoke search field by using search button in the toolbar. The search updates after at least three letters are entered. When user selects the name of the bus stop, all available options are diplayed on the map. User than has to tap on the right bus station and is transported into timetables section of the toolbar where all buses approaching thist stop in the next X time interval are displayed. Live buses gain green border and live track icon, delays are displayed if available. If clicked on the bus it tracks it on the map.

>### 4. Bus line geometry with delays
> Everytime the popup of the bus is opened, the bus line geometry (polyline) will apear if available. Markers for bus stops are also added. If user holds on the stop marker scheduled arrival on the bus will appear. If realtime info is available, predicted arrival as well as delay will be displayed as well.

>### 5. Shraing function
> If device is supported the share button will apear in the bottom left corner of the popup bubble. Pressing it will invoke a `navigator.share()` method, sharing a link with busID as such: https://zznidar.github.io/busi`?{busID}`. If this link is accessed, on the page load a `displayBus()` function will be invoked and bus popup will be opened automatically so the end user can track the bus. This is a very suitable way of sharing locations between users.