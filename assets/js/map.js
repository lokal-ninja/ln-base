// multiple markers with clickable popups
// via http://harrywood.co.uk/maps/examples/openlayers/marker-popups.view.html
function determineZoom(entries, count, center) {
    const page = window.location.pathname.split('/').length; // 3, 4, 5
    if (page === 3 || document.querySelector('#map.w-100')) {
      // Region/Category page
      const maximumDistance = calcMaxDistance(entries, count, center, 128);
      if (maximumDistance > 128) {
        return 6;
      }
      else if (count > 1250 || maximumDistance > 64) {
        return 7;
      }
      else if (count > 250 || maximumDistance > 32) {
        return 8;
      }
      else if (count > 50 || maximumDistance > 16) {
        return 9;
      }
      else if (count > 10 || maximumDistance > 8) {
        return 10;
      }
      else if (count > 1 || maximumDistance > 4) {
        return 11;
      }
      // Default value for this page type
      return 12;
    }
    else if (page === 4) {
      // City page
      if (count > 2500) {
        return 10;
      }
      const maximumDistance = calcMaxDistance(entries, count, center, 8);
      if (maximumDistance > 8) {
        return 10;
      }
      else if (count > 500 || maximumDistance > 4) {
        return 11;
      }
      else if (count > 100 || maximumDistance > 2) {
        return 12;
      }
      else if (count > 20 || maximumDistance > 1) {
        return 13;
      }
      else if (count > 4 || maximumDistance > 0.5) {
        return 14;
      }
      else if (count > 1 || maximumDistance > 0.25) {
        return 15;
      }
    }
    // Entry page or no other city match
    return 16;
}

function calcMaxDistance(entries, count, center, stop) {
    let maximumDistance = 0;
  
    for (let i = 0; i < count; i++) {
      const entry = entries[i];
      const result = window.calcDistance(
        center[0],
        center[1],
        parseFloat(entry.dataset.lat),
        parseFloat(entry.dataset.lon)
      );
      if (result > maximumDistance) {
        maximumDistance = result;
        if (maximumDistance > stop) {
          break;
        }
      }
    }
    
    return maximumDistance;
}
// via https://stackoverflow.com/a/30033564
/**
 * @param latLngInDeg array of arrays with latitude and longtitude
 *   pairs in degrees. e.g. [[latitude1, longtitude1], [latitude2
 *   [longtitude2] ...]
 *
 * @return array with the center latitude longtitude pairs in 
 *   degrees.
 */
function rad2degr(rad) { return rad * 180 / Math.PI; }
function degr2rad(degr) { return degr * Math.PI / 180; }
 
function getLatLngCenter(entries, count) {
   let sumX = 0;
   let sumY = 0;
   let sumZ = 0;
   for (let i = 0; i < count; i++) {
     const lat = entries[i].dataset.lat;
     const lon = entries[i].dataset.lon;
 
     if (lat && lon) {
       // May be empty for cities without coords, see Bremerhaven for example
       const latRad = degr2rad(lat);
       const lngRad = degr2rad(lon);
       
       // Sum of cartesian coordinates
       sumX += Math.cos(latRad) * Math.cos(lngRad);
       sumY += Math.cos(latRad) * Math.sin(lngRad);
       sumZ += Math.sin(latRad);
     }
   }
   const avgX = sumX / count;
   const avgY = sumY / count;
   const avgZ = sumZ / count;
 
   // Convert average x, y, z coordinate to latitude and longtitude
   const lng = Math.atan2(avgY, avgX);
   const hyp = Math.sqrt(avgX * avgX + avgY * avgY);
   const lat = Math.atan2(avgZ, hyp);
 
   return ([rad2degr(lat), rad2degr(lng)]);
}

window.updateMap = function() {
    const matches = [];
    window.vectorLayer.features.forEach(function(feature) {
        const entry = feature.attributes.entry;
        if (entry) {
            if (window.isElementVisible(entry)) {
                feature.style = null;
                matches.push(entry);
            }
            else {
                feature.style = { display: 'none' };
            }
        }
    });
    const count = matches.length;
    if (count) {
        const center = getLatLngCenter(matches, count);
        window.vectorLayer.map.setCenter(createLonLat(center[1], center[0], window.vectorLayer.map), determineZoom(matches, count, center));
    }
    window.vectorLayer.redraw();
}

function createEPSG() {
    return new OpenLayers.Projection('EPSG:4326'); // WGS 1984 projection
}
  
function createLonLat(longitude, latitude, map) {
    return new OpenLayers.LonLat(longitude, latitude).transform(createEPSG(), map.getProjectionObject());
}
  
function createGeometryPoint(longitude, latitude, epsg4326, projectTo) {
    return new OpenLayers.Geometry.Point(longitude, latitude).transform(epsg4326, projectTo);
}

const map = new OpenLayers.Map('map');
map.addLayer(new OpenLayers.Layer.OSM());
window.vectorLayer = new OpenLayers.Layer.Vector('Overlay');
map.addLayer(window.vectorLayer);

const epsg4326 = createEPSG();
const projectTo = map.getProjectionObject(); // The map projection (Spherical Mercator)

window.getEntries().forEach(function(entry) {
    const lat = entry.dataset.lat;
    const lon = entry.dataset.lon;
    if (lat && lon) {
    // Define markers as "features" of the vector layer:
    const link = entry.firstElementChild;
    const feature = new OpenLayers.Feature.Vector(
        createGeometryPoint(lon, lat, epsg4326, projectTo),
        {
        link: '<a href="' + link.href + '">' + link.textContent + '</a>',
        entry: entry
        }
    );
    window.vectorLayer.addFeatures(feature);
    }
});
// Add a selector control to the vectorLayer with popup functions
const controls = {
    selector: new OpenLayers.Control.SelectFeature(window.vectorLayer, { onSelect: createPopup, onUnselect: destroyPopup })
};

function createPopup(feature) {
    feature.popup = new OpenLayers.Popup.FramedCloud('pop',
    feature.geometry.getBounds().getCenterLonLat(),
    null,
    feature.attributes.link,
    null,
    true,
    function() {
        controls['selector'].unselectAll();
    }
    );
    //feature.popup.closeOnMove = true;
    map.addPopup(feature.popup);
}

function destroyPopup(feature) {
    feature.popup.destroy();
    feature.popup = null;
}

map.addControl(controls['selector']);
controls['selector'].activate();

let userFeature;
let watchID;
const locateButton = document.getElementById('locate-btn');
locateButton.classList.remove('d-none'); // Dont forget to show
locateButton.onclick = function () {
    if (navigator.geolocation) {
    if (!this.classList.contains('tracking')) {
        watchID = navigator.geolocation.watchPosition(function(position) {
        const longitude = position.coords.longitude;
        const latitude = position.coords.latitude;
        const lonLat = createLonLat(longitude, latitude, map);
        if (!userFeature) {
            // Create (new) marker for user location
            userFeature = new OpenLayers.Feature.Vector(
            createGeometryPoint(longitude, latitude, epsg4326, projectTo),
            {
                link: LANG.myLocation
            },
            {
                externalGraphic: '/js/img/marker.png',
                graphicHeight: 25,
                graphicWidth: 21,
                graphicXOffset: -10,
                graphicYOffset: -25
            }
            );
            window.vectorLayer.addFeatures(userFeature);

            // and center map
            map.setCenter(lonLat, 16);
        }
        else {
            // Move feature to new position
            userFeature.move(lonLat);
        }
        // Set button
        locateButton.classList.add('tracking');
        locateButton.textContent = LANG.stopTracking;
        },
        function(error) {
        alert(getGeolocationErrorMessage(error));
        locateButton.classList.add('d-none');
        },
        { timeout: 5000 });
    }
    else {
        navigator.geolocation.clearWatch(watchID);
        this.classList.remove('tracking');
        this.textContent = LANG.trackLocation;
    }
    }
    else {
    alert(LANG.geolocationAlert);
    }
}
window.updateMap();
