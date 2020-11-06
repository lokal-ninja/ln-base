// Helpers
// adopted from https://github.com/gabmontes/fast-haversine
const R = 6378;
const PI_360 = Math.PI / 360;

function distance(lat1, lon1, lat2, lon2) {
  const cLat = Math.cos((lat1 + lat2) * PI_360);
  const dLat = (lat2 - lat1) * PI_360;
  const dLon = (lon2 - lon1) * PI_360;

  const f = dLat * dLat + cLat * cLat * dLon * dLon;
  const c = 2 * Math.atan2(Math.sqrt(f), Math.sqrt(1 - f));

  return R * c;
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
  let message = 'Location query not successful.';
  switch(error.code) {
    case error.PERMISSION_DENIED:
      message = 'User refused the geolocation request.';
      break;
    case error.POSITION_UNAVAILABLE:
      message = 'Location information not available.';
      break;
    case error.TIMEOUT:
      message = 'Timeout for user location request.';
      break;
    case error.UNKNOWN_ERROR:
      message = 'An unknown error occurred.';
      break;
  }
  alert(message);
}

function geolocationAlert() {
  alert('Geolocation is not supported by your browser.');
}

function setCenter (entries) {
  const count = entries.length;
  if (count) {
    // Get center
    const center = getLatLngCenter(entries);
    const centerLat = center[0];
    const centerLon = center[1];

    // Calculate maximum distance to center point
    let maximumDistance = 0;
    entries.forEach(function(entry) {
      const result = distance(
        centerLat,
        centerLon,
        parseFloat(entry.dataset.lat),
        parseFloat(entry.dataset.lon)
      );
      if (result > maximumDistance) {
        maximumDistance = result;
      }
    });
    // Determine zoom factor
    const page = window.location.pathname.split('/').length; // 3, 4, 5
    let zoom;
    switch (page) {
      case 3:
        // Region page
        if (maximumDistance > 128) {
          zoom = 6;
        }
        else if (count > 1250 || maximumDistance > 64) {
          zoom = 7;
        }
        else if (count > 250 || maximumDistance > 32) {
          zoom = 8;
        }
        else if (count > 50 || maximumDistance > 16) {
          zoom = 9;
        }
        else if (count > 10 || maximumDistance > 8) {
          zoom = 10;
        }
        else if (count > 1 || maximumDistance > 4) {
          zoom = 11;
        }
        else {
          zoom = 12;
        }
        break;
      case 4:
        // City page
        if (count > 2500 || maximumDistance > 8) {
          zoom = 10;
        }
        else if (count > 500 || maximumDistance > 4) {
          zoom = 11;
        }
        else if (count > 100 || maximumDistance > 2) {
          zoom = 12;
        }
        else if (count > 20 || maximumDistance > 1) {
          zoom = 13;
        }
        else if (count > 4 || maximumDistance > 0.5) {
          zoom = 14;
        }
        else if (count > 1 || maximumDistance > 0.25) {
          zoom = 15;
        }
        else {
          zoom = 16;
        }
        break;
      case 5:
        // Entry page
        zoom = 16;
        break;
      default:
        console.error('Unknown page for map.')
    }
    vectorLayer.map.setCenter(createLonLat(centerLon, centerLat), zoom);
  }
}
// Filter input
function updateGUI () {
  updateMap();
  updateCount();
}
function updateMap () {
  if (vectorLayer) {
    // Update map, too
    const matches = [];
    vectorLayer.features.forEach(function(feature) {
      const entry = feature.attributes.entry;
      if (entry) {
        if (entry.getClientRects().length !== 0 || entry.hidden) {
          feature.style = null;
          matches.push(entry);
        }
        else {
          feature.style = { display: 'none' };
        }
      }
    });
    setCenter(matches);
    vectorLayer.redraw();
  }
}

function updateCount () {
  const samp = document.querySelector('section samp');
  if (samp) {
    let count = 0;
    entries.forEach(function(entry) {
      if (entry.getClientRects().length !== 0) {
        count++;
      }
    });
    samp.textContent = count;
  }
}

function startFilter() {
  if (!entries) {
    entries = Array.from(document.querySelectorAll('li[data-lat]'));
  }
  const regex = new RegExp(this.value, 'i');
  entries.forEach(function(entry) {
    if (regex.test(entry.textContent)) {
      entry.classList.remove('d-none');
    }
    else {
      entry.classList.add('d-none');
    }
  });
  updateGUI();
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
        if (buttons[i].classList.contains('active') && ++count === 2) {
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
    updateGUI();
  }
});
// Map
// multiple markers with clickable popups
// via http://harrywood.co.uk/maps/examples/openlayers/marker-popups.view.html
function createLonLat(longitude, latitude) {
  return new OpenLayers.LonLat(longitude, latitude).transform(epsg4326, projectTo);
}

function createGeometryPoint(longitude, latitude) {
  return new OpenLayers.Geometry.Point(longitude, latitude).transform(epsg4326, projectTo);
}

function buildMap() {
  const map = new OpenLayers.Map('map');
  map.addLayer(new OpenLayers.Layer.OSM());
  vectorLayer = new OpenLayers.Layer.Vector('Overlay');
  map.addLayer(vectorLayer);

  epsg4326 = new OpenLayers.Projection('EPSG:4326'); // WGS 1984 projection
  projectTo = map.getProjectionObject(); // The map projection (Spherical Mercator)

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
          link: '<a href="' + link.href + '">' + link.textContent + '</a>',
          entry: entry
        }
      );
      vectorLayer.addFeatures(feature);
    }
  });
  setCenter(entries);

  // Add a selector control to the vectorLayer with popup functions
  const controls = {
    selector: new OpenLayers.Control.SelectFeature(vectorLayer, { onSelect: createPopup, onUnselect: destroyPopup })
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
          link: 'My location'
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
    locateButton.textContent = 'Stop tracking';
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
        this.textContent = 'Track location';
        centering = true;
      }
    }
    else {
      geolocationAlert();
    }
  }
  updateGUI();
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
// Select to category
function clickScrollCategory (category) {
  const name = category.replace('#', '').toLowerCase();
  for (let i = 0; i < buttons.length; i++) {
    const button = buttons[i];
    if (button.textContent.toLowerCase() === name) {
      button.click();
      button.scrollIntoView();
      break;
    }
  }
}
window.addEventListener('DOMContentLoaded', function() {
  const hash = window.location.hash;
  if (hash) {
    clickScrollCategory(decodeURIComponent(hash));
  }
});
// Search
async function fetchRegions() {
  const response = await fetch('/' + window.location.hostname.split(".")[0] + '.json');
  const regions = await response.json();
  return regions;
}

async function fetchRegion (region) {
  const regionSlug = slugo(region);
  return fetch('/' + regionSlug + '/index.json')
  .then(function(response) {
    return response.json();
  })
  .then(function(data) {
    return data.map(function(item) {
      return {
        value: item,
        label: item + ', ' + region,
        customProperties: {
          region: regionSlug,
        }
      };
    });
  })
  .catch(function(error) {
    console.error(error);
  });
}

const cities = document.getElementById('cities');
if (cities) {
  const citiesChoices  = new Choices(cities, {
    placeholderValue: 'Choose place',
    searchFields: ['value'],
    searchPlaceholderValue: 'Search...',
    loadingText: 'Loading...',
    noResultsText: 'No results found',
    itemSelectText: '+',
    noChoicesText: 'with at least three letters',
    renderChoiceLimit : 0,
    searchResultLimit: 100,
    shouldSort: false,
    position: 'bottom'
  })
  .setChoices(function() {
    return new Promise(function (resolve) {
      resolve();
    });
  })
  .then(function(instance) {
    instance.containerOuter.element.addEventListener('click', function() {
      // Load data after user input
      instance.setChoices(async function() {     
        fetchRegions()
        .then(function(regions) {
          const promises = regions.map(function(region) {
            return fetchRegion(region);
          });
          return Promise.all(promises)
          .then(function(result) {
            let citiesArray = [];
            result.forEach(function(array) {
              if (array) {
                citiesArray = citiesArray.concat(array);
              }
            });
            return citiesArray;
          })
          .catch(function(error) {
            console.error(error);
          })
        });
      })
      .then(function() {
        // We have to re-set focus on input again
        instance.input.element.focus();
      });
    }, { once: true });
    instance.passedElement.element.addEventListener('change', function(e) {
      searchButton.disabled = true;
      shopsChoices.clearStore();
      shopsChoices.setChoices(async function() {
        const city = instance.getValue();
        return fetch('/' + city.customProperties.region + '/' + slugo(e.detail.value) + '/index.json')
        .then(function(response) {
          return response.json();
        })
        .then(function(data) {
          return data.map(function(item) {
            return {
              value: item,
              label: item
            };
          });
        })
      })
      .then(function(instance2) {
        instance2.passedElement.element.addEventListener('change', function() {
          searchButton.disabled = false;
        });
      });
      shopsChoices.enable();
    });
    const searchButton = document.getElementById('search-btn');
    if (searchButton) {
      searchButton.onclick = function () {
        const city = instance.getValue();
        const shop = shopsChoices.getValue(true);
        const pathname = '/' + city.customProperties.region + '/' + slugo(city.value) + '/';
        const isCategory = shop[0] === '#';
        if (window.location.pathname === pathname && isCategory) {
          // We're on the right page already, only scroll to category
          clickScrollCategory(shop);
        }
        else {
          // Relocate to new location
          window.location =  pathname + (isCategory ? shop : slugo(shop) + '/');
        }
      };
    }
  });
}

const shops = document.getElementById('shops');
if (shops) {
  const shopsChoices = new Choices(shops, {
    placeholderValue: 'Choose #category or shop',
    searchFields: ['value'],
    searchPlaceholderValue: 'Filter...',
    loadingText: 'Loading...',
    noResultsText: 'No results found',
    itemSelectText: '+',
    shouldSort: false,
    //renderChoiceLimit : -1,
    searchResultLimit: 100,
    position: 'bottom'
  }).disable();
}
// Globals
let entries;
let epsg4326;
let projectTo;
let vectorLayer;