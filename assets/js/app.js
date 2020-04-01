// Helpers
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

function getLatLngCenter(latLngInDegr) {
  var LATIDX = 0;
  var LNGIDX = 1;
  var sumX = 0;
  var sumY = 0;
  var sumZ = 0;

  for (var i=0; i<latLngInDegr.length; i++) {
      var lat = degr2rad(latLngInDegr[i][LATIDX]);
      var lng = degr2rad(latLngInDegr[i][LNGIDX]);
      // sum of cartesian coordinates
      sumX += Math.cos(lat) * Math.cos(lng);
      sumY += Math.cos(lat) * Math.sin(lng);
      sumZ += Math.sin(lat);
  }

  var avgX = sumX / latLngInDegr.length;
  var avgY = sumY / latLngInDegr.length;
  var avgZ = sumZ / latLngInDegr.length;

  // convert average x, y, z coordinate to latitude and longtitude
  var lng = Math.atan2(avgY, avgX);
  var hyp = Math.sqrt(avgX * avgX + avgY * avgY);
  var lat = Math.atan2(avgZ, hyp);

  return ([rad2degr(lat), rad2degr(lng)]);
}

function loadScript(file) {
  return new Promise(function(resolve, reject) {
    const script = document.createElement('script');
    script.async = true;
    script.src = '/js/' + file;
    script.onload = resolve;
    script.onerror = reject;
    if (document.head.lastChild.src !== script.src) {
      document.head.appendChild(script);
    }
    else {
      resolve();
    }
  })
}

function geolocationError(error) {
  let message = 'Standortabfrage nicht erfolgreich.';
  switch(error.code) {
    case error.PERMISSION_DENIED:
      message = 'Nutzer verweigerte die Geolocationanfrage.';
      break;
    case error.POSITION_UNAVAILABLE:
      message = 'Standortinformation nicht verfügbar.';
      break;
    case error.TIMEOUT:
      message = 'Zeitüberschreiung bei der Anfrage des Nutzerstandorts.';
      break;
    case error.UNKNOWN_ERROR:
      message = 'Ein unbekannter Fehler trat auf.';
      break;
  }
  alert(message);
}

function geolocationAlert() {
  alert('Geolocation wird von deinem Browser nicht unterstützt.');
}

const findButton = document.getElementById('find-btn');
if (findButton) {
  findButton.onclick = function () {
    if (navigator.geolocation) {
      // We might need permission for this
      navigator.geolocation.getCurrentPosition(findSuccess, geolocationError);
    }
    else {
      geolocationAlert();
    }
  };
}
// Filter input
function startFilter() {
  if (!entries) {
    entries = Array.from(document.querySelectorAll('li'));
  }
  const regex = new RegExp(this.value, 'gi');
  entries.forEach(function(entry) {
    entry.style.display = regex.test(entry.textContent) ? 'initial' : 'none';
  });
}
const input = document.querySelector('input');
if (input) {
  input.addEventListener('keyup', startFilter);
  input.addEventListener('keypress', function(event) {
    if (event.keyCode === 13) {
      event.preventDefault();
    }
  });
}
let entries;
// Category buttons
const buttons = Array.from(document.querySelectorAll('.categories button'));
buttons.forEach(function(button) {
  button.onclick = function () {
    if (!entries) {
      entries = Array.from(document.querySelectorAll('li'));
    }
    let showAll = true;
    if (button.classList.contains('active')) {
      // Check sibling buttons if there is any other active
      let count = 0;
      for (let i = 0; i < buttons.length; i++) {
        if (buttons[i].classList.contains('active')) {
          count++
        }
        if (count === 2) {
          // We found at least one other active button
          showAll = false;
          break
        }
      }
    }
    entries.forEach(function(entry) {
      if (entry.dataset.shop === button.textContent) {
        entry.classList.toggle('show-always');
      }
      if (button.classList.contains('active') && showAll) {
        entry.style.display = 'list-item';
      }
      else {
        entry.style.display = 'none';
      }
    });
    button.classList.toggle('active');
  }
});
// Map
// multiple markers with clickable popups
// via http://harrywood.co.uk/maps/examples/openlayers/marker-popups.view.html
function buildMap() {
  function createLonLat(longitude, latitude) {
    return new OpenLayers.LonLat(longitude, latitude).transform(epsg4326, projectTo);
  }
  
  function createGeometryPoint(longitude, latitude) {
    return new OpenLayers.Geometry.Point(longitude, latitude).transform(epsg4326, projectTo);
  }
  
  const map = new OpenLayers.Map('map');
  map.addLayer(new OpenLayers.Layer.OSM());
  const vectorLayer = new OpenLayers.Layer.Vector('Overlay');
  map.addLayer(vectorLayer);

  const epsg4326 = new OpenLayers.Projection('EPSG:4326'); // WGS 1984 projection
  const projectTo = map.getProjectionObject(); // The map projection (Spherical Mercator)

  const array = [];
  const locations = Array.from(document.querySelectorAll('li[data-lat]'));
  locations.forEach(function(location) {
    array.push([location.dataset.lat, location.dataset.lon]);

    // Define markers as "features" of the vector layer:
    const feature = new OpenLayers.Feature.Vector(
      createGeometryPoint(location.dataset.lon, location.dataset.lat),
      {
        description: '<a href="' + location.href + '">' + location.textContent + '</a>'
      },
      {
        externalGraphic: '/js/img/marker.png',
        graphicHeight: 25,
        graphicWidth: 21,
        graphicXOffset: -10,
        graphicYOffset: -12
      }
    );
    vectorLayer.addFeatures(feature);
  });
  // Determine map center
  let zoom = 15;
  const count = locations.length;
  if (count > 50) {
    zoom = 12;
  }
  else if (count > 25) {
    zoom = 13;
  }
  else if (count > 5) {
    zoom = 14;
  }
  const center = getLatLngCenter(array);
  map.setCenter(createLonLat(center[1], center[0]), zoom);

  // Add a selector control to the vectorLayer with popup functions
  const controls = {
    selector: new OpenLayers.Control.SelectFeature(vectorLayer, { onSelect: createPopup, onUnselect: destroyPopup })
  };

  function createPopup(feature) {
    feature.popup = new OpenLayers.Popup.FramedCloud('pop',
      feature.geometry.getBounds().getCenterLonLat(),
      null,
      feature.attributes.description,
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

  // Locate user position
  function locateSuccess(position) {
    const longitude = position.coords.longitude;
    const latitude = position.coords.latitude;
    const lonLat = createLonLat(longitude, latitude);
    if (first) {
      // Create (new) marker for user location
      userFeature = new OpenLayers.Feature.Vector(
        createGeometryPoint(longitude, latitude),
        {
          description: 'Mein Standort'
        },
        {
          externalGraphic: '/js/img/marker-green.png',
          graphicHeight: 25,
          graphicWidth: 21,
          graphicXOffset: -10,
          graphicYOffset: -25
        }
      );
      vectorLayer.addFeatures(userFeature);

      // and center map
      map.setCenter(lonLat, 16);
      first = false;
    }
    else {
      // Move feature to new position
      userFeature.move(lonLat);
    }
    // Set button
    locateButton.classList.add('tracking');
    locateButton.textContent = 'Tracken beenden';
  }
  let userFeature;
  let first = true;
  let watchID;
  const locateButton = document.getElementById('locate-btn');
  locateButton.onclick = function () {
    if (navigator.geolocation) {
      if (!this.classList.contains('tracking')) {
        watchID = navigator.geolocation.watchPosition(locateSuccess, geolocationError, { enableHighAccuracy: true });
      }
      else {
        navigator.geolocation.clearWatch(watchID);
        this.classList.remove('tracking');
        this.textContent = 'Standort tracken';
        centering = true;
      }
    }
    else {
      geolocationAlert();
    }
  }
}
const mapButton = document.querySelector('#map button');
if (mapButton) {
  mapButton.onclick = function () {
    loadScript('OpenLayers.js')
    .then(function() {
      buildMap();

      // and hide buttons and overlay
      mapButton.style.display = 'none';
      const parent = mapButton.parentNode;  
      parent.children[1].style.display = 'none';
      parent.classList.remove('is-overlay');

      // Dont forget to show locate button
      parent.children[2].style.display = 'inline-block';
    });
  };
}
