
`Version: 2.0`
# Changelog
All versions of releases will be documented here. Versions before 1.0 relase are not documented here as changelog was not established then. 

## v2.1
Release date: 2025-04-20
### What is new?
**🌟 Improvements**  
* Display path geometries for all trips (including future and past ones), not just currently driving buses.
* Do the same if user clicks on the green relation button (instead of showing some scary JSON from the API).

## v2.0
Release date: 4.2.2025
### What is new?
**🌟 Improvements**  
* Whole codebase has been rewritten to include English variables, function names and documentation.
* The documentation has been established along with changelog.
* UI redesign for popup. Now next bus stop with live data is displayed and other non-vital info is ommited.
* In tracking mode buses are made opaque to enable better visualization.

**🐛 Bug fixes**  
* You can now move over the map wihtout being teleported back.
* When using trackable link website waits for DOM to be loaded to make sure buses are available before trying to track it.

## v1.0
Release date: 28.1.2025
### What is new?
**🌟 Improvements**  
* Changed API source from OJPP to beta.brezavta.si  
* Added geometry overlay along with bus stops and scheduled arrivals to the map, when a bus is selected.

**🐛 Bug fixes**  
* After each refresh more and more requests would be made. It is now fixed to only request necessary data once.

