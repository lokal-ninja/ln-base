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

function getLatLngCenter(entries) {
  let sumX = 0;
  let sumY = 0;
  let sumZ = 0;
  const count = entries.length;
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
    entries = Array.from(document.querySelectorAll('li[data-lat]'));
  }
  const regex = new RegExp(this.value, 'gi');
  entries.forEach(function(entry) {
    if (regex.test(entry.textContent)) {
      entry.classList.remove('d-none');
    }
    else {
      entry.classList.add('d-none');
    }
  });
  if (vectorLayer) {
    // Update map, too
    vectorLayer.features.forEach(function(feature) {
      const description = feature.attributes.description;
      if (description !== myPlaceString) {
        if (regex.test(description)) {
          feature.style = null;
        }
        else {
          feature.style = { display: 'none' };
        }
      }
    });
    vectorLayer.redraw();
  }
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
// Category buttons
const buttons = Array.from(document.querySelectorAll('.categories button'));
buttons.forEach(function(button) {
  button.onclick = function () {
    if (!entries) {
      entries = Array.from(document.querySelectorAll('li[data-lat]'));
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
      if (button.classList.contains('active')) {
        if (showAll) {
          entry.classList.remove('show');
          entry.classList.remove('hide');
        }
        else if (entry.dataset.shop === button.textContent) {
          entry.classList.remove('show');
          entry.classList.add('hide');
        }
      }
      else if (entry.dataset.shop === button.textContent) {
        entry.classList.remove('hide')
        entry.classList.add('show');
      }
      else if (!entry.classList.contains('show')) {
        entry.classList.add('hide')
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
  vectorLayer = new OpenLayers.Layer.Vector('Overlay');
  map.addLayer(vectorLayer);

  const epsg4326 = new OpenLayers.Projection('EPSG:4326'); // WGS 1984 projection
  const projectTo = map.getProjectionObject(); // The map projection (Spherical Mercator)

  if (!entries) {
    entries = Array.from(document.querySelectorAll('li[data-lat]'));
  }
  entries.forEach(function(entry) {
    const lat = entry.dataset.lat;
    const lon = entry.dataset.lon;
    if (lat && lon) {
      // Define markers as "features" of the vector layer:
      const link = entry.firstElementChild;
      const feature = new OpenLayers.Feature.Vector(
        createGeometryPoint(lon, lat),
        {
          description: '<a href="' + link.href + '">' + link.textContent + '</a>'
        }
      );
      vectorLayer.addFeatures(feature);
    }
  });
  // Determine map center
  const count = entries.length;
  const page = window.location.pathname.split('/').length; // 3, 4, 5
  let zoom;
  switch (page) {
    case 3:
      // Region page
      if (count > 1000) {
        zoom = 8;
      }
      else if (count > 250) {
        zoom = 9;
      }
      else if (count > 50) {
        zoom = 10;
      }
      else {
        zoom = 11;
      }
      break;
    case 4:
      // City page
      if (count > 1000) {
        zoom = 11;
      }
      else if (count > 250) {
        zoom = 12;
      }
      else if (count > 25) {
        zoom = 13;
      }
      else if (count > 5) {
        zoom = 14;
      }
      else {
        zoom = 15;
      }
      break;
    case 5:
      // Entry page
      zoom = 16;
      break;
    default:
      console.error('Unknown page for map.')
  }
  const center = getLatLngCenter(entries);
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
          description: myPlaceString
        },
        {
          externalGraphic: '/js/img/marker.png',
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
// Cache entries
let entries;
let vectorLayer;

// Constants
const myPlaceString = 'Mein Standort';
