// Globals
let categories;
let entries;
let epsg4326;
let projectTo;
let vectorLayer;
let citiesChoices;
let shopsChoices;
let categoryButtons;

// Constants
const SUBDOMAIN = window.location.hostname.split(".")[0];

// Language
let LANG;

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
  let message = LANG.geolocationError.message;
  switch(error.code) {
    case error.PERMISSION_DENIED:
      message = LANG.geolocationError.permissionDenied;
      break;
    case error.POSITION_UNAVAILABLE:
      message = LANG.geolocationError.positionUnavailable;
      break;
    case error.TIMEOUT:
      message = LANG.geolocationError.timeout;
      break;
    case error.UNKNOWN_ERROR:
      message = LANG.geolocationError.unknownError;
      break;
  }
  alert(message);
}

function geolocationAlert() {
  alert(LANG.geolocationAlert);
}

function calcMaxDistance(entries, count, center, stop) {
  let maximumDistance = 0;

  for (let i = 0; i < count; i++) {
    const entry = entries[i];
    const result = distance(
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

function setCenter(entries) {
  const count = entries.length;
  if (count) {
    const center = getLatLngCenter(entries, count);
    vectorLayer.map.setCenter(createLonLat(center[1], center[0]), determineZoom(entries, count, center));
  }
}
// Filter input
function updateCount(count, selector) {
  const filterSamp = document.querySelector('.filter-' + selector + ' samp');
  if (filterSamp) {
    filterSamp.textContent = count;
  }
}

function updateMap() {
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

  return matches.length;
}

function updateGUI() {
  let count = 0;
  if (vectorLayer) {
    count = updateMap();
  }
  else {
    count = countShownItems(entries);
  }
  updateCount(count, 'entries');
}

function countShownItems(items) {
  let count = 0;
  items.forEach(function(item) {
    if (item.getClientRects().length !== 0) {
      count++;
    }
  });

  return count;
}

function toggleItemDisplay(value, items) {
  const regex = new RegExp(value, 'i');
  items.forEach(function(item) {
    if (regex.test(item.textContent)) {
      item.classList.remove('d-none');
    }
    else {
      item.classList.add('d-none');
    }
  });
}

function query(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function debounce(fn, duration) {
  let timer;

  return function () {
    clearTimeout(timer);
    timer = setTimeout(fn, duration);
  }
}

function startEntriesFilter(value) {
  if (!entries) {
    entries = query('li[data-lat]');
  }
  toggleItemDisplay(value, entries);
  updateGUI();
}

function startCategoriesFilter(value) {
  if (!categories) {
    categories = query('.categories button, .categories a');
  }
  toggleItemDisplay(value, categories);
  updateCount(countShownItems(categories), 'categories');
}

function setupFilters() {
  const filterInputs = query('.filter > input');
  filterInputs.forEach(function(input) {
    const startFilter = input.parentElement.classList.contains('filter-entries') ? startEntriesFilter : startCategoriesFilter;
    input.addEventListener('input', debounce(function () {
      startFilter(input.value);
    }, 500));
    input.addEventListener('keypress', function(event) {
      if (event.keyCode === 13) {
        event.preventDefault();
      }
    });
  });
}
// Category buttons
function setupButtons() {
  categoryButtons = query('.categories button');
  categoryButtons.forEach(function(button) {
    button.onclick = function () {
      if (!entries) {
        entries = query('li[data-lat]');
      }
      let showAll = true;
      if (button.classList.contains('active')) {
        // Check sibling buttons if there is any other active
        let count = 0;
        for (let i = 0; i < categoryButtons.length; i++) {
          if (categoryButtons[i].classList.contains('active') && ++count === 2) {
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
}
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
    entries = query('li[data-lat]');
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
    locateButton.textContent = LANG.stopTracking;
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
        this.textContent = LANG.trackLocation;
      }
    }
    else {
      geolocationAlert();
    }
  }
  updateMap();
}

function setupMap() {
  const mapButton = document.querySelector('#map button');
  if (mapButton) {
    mapButton.onclick = function () {
      // Preconnect to OSM early
      const tiles = ['a', 'b', 'c'];
      tiles.forEach(function(tile) {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = 'https://' + tile + '.tile.openstreetmap.org';
        document.head.appendChild(link);
      });
      // Hide buttons and overlay
      const parent = mapButton.parentNode;
      for (let i = 0; i < 3; i++) {
        parent.children[i].style.display = 'none';
      }
      parent.classList.remove('is-overlay');

      // Dont forget to show locate button
      document.getElementById('locate-btn').style.display = 'inline-block';

      // Finally load OSM map library
      loadScript('OpenLayers.js')
      .then(function() {
        buildMap();
      });
    };
  }
}
// Select to category
function clickScrollCategory (category) {
  const name = category.replace('#', '').toLowerCase();
  for (let i = 0; i < categoryButtons.length; i++) {
    const button = categoryButtons[i];
    if (button.textContent.toLowerCase() === name) {
      button.click();
      button.scrollIntoView();
      break;
    }
  }
}

function setupClickScroll() {
  window.addEventListener('DOMContentLoaded', function() {
    const hash = window.location.hash;
    if (hash) {
      clickScrollCategory(decodeURIComponent(hash));
    }
  });
}
// Search
async function fetchRegions() {
  const response = await fetch('/' + SUBDOMAIN + '.json');
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

function setupSearch() {
  const cities = document.getElementById('cities');
  if (cities) {
    citiesChoices = new Choices(cities, {
      placeholderValue: LANG.choose,
      searchFields: ['value'],
      searchPlaceholderValue: LANG.search,
      loadingText: LANG.loading,
      noResultsText: LANG.noResultsFound,
      itemSelectText: '+',
      noChoicesText: LANG.withAtLeastThreeLetters,
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
          return fetchRegions()
          .then(async function(regions) {
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
          })
        })
        .then(function() {
          // We have to re-set focus on input again
          instance.input.element.focus();
        });
      }, { once: true });
      instance.passedElement.element.addEventListener('change', function(e) {
        searchButton.disabled = false;
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
          const isCategory = shop ? shop[0] === '#' : false;
          if (window.location.pathname === pathname) {
            if (isCategory) {
              // We're on the right page already, only scroll to category
              clickScrollCategory(shop);
            }
          }
          else {
            // Relocate to new location
            window.location =  pathname + (shop ? isCategory ? shop : slugo(shop) + '/' : '');
          }
        };
      }
    })
  }

  const shops = document.getElementById('shops');
  if (shops) {
    shopsChoices = new Choices(shops, {
      placeholderValue: LANG.choose,
      searchFields: ['value'],
      searchPlaceholderValue: LANG.filter,
      loadingText: LANG.loading,
      noResultsText: LANG.noResultsFound,
      itemSelectText: '+',
      shouldSort: false,
      renderChoiceLimit : 100,
      searchResultLimit: 100,
      position: 'bottom'
    }).disable();
  }
}
// Chat
function removeTags (string) {
  return string.replace(/<(?:.|\n)*?>/gm, '');
}

function md2html (md) {
  const bold_pattern1 = /\*{2}(.+)\*{2}/gim; // <b>
  const bold_pattern2 = /\_{2}(.+)\_{2}/gim;  // <b>
  const italic_pattern1 = /\_(.+)\_/gim; // <i>
  const italic_pattern2 = /\*(.+)\*/gim; // <i>
  const striketrough_pattern = /\~{2}(.+)\~{2}/gim; // <del>
  const a_pattern1 = /\[(.+)\]\((.+)\)/gim; // <a>
  const a_pattern2 = /\[(.+)\]\((.+) \"(.+)\"\)/gim; // <a>
  const a_pattern3 = /\[(.+)\]/gim; // <a>

  /* links */
  md = md.replace(a_pattern1, function(match, title, url) {
    return '<a href="' + url + '">' + title + '</a>';
  })
  md = md.replace(a_pattern2, function(match, title, url, tooltip) {
    return '<a href="' + url + '" title="' + tooltip + '">' + title + '</a>';
  })
  md = md.replace(a_pattern3, function(match, url) {
    return '<a href="' + url + '">' + url + '</a>';
  })

  /* bold */
  md = md.replace(bold_pattern1, function(match, str) {
    return '<b>' + str + '</b>';
  })
  md = md.replace(bold_pattern2, function(match, str) {
    return '<b>' + str + '</b>';
  })

  /* italic */
  md = md.replace(italic_pattern1, function(match, str) {
    return '<i>' + str + '</i>';
  })
  md = md.replace(italic_pattern2, function(match, str) {
    return '<i>' + str + '</i>';
  })

  /* striketrough */
  md = md.replace(striketrough_pattern, function(match, str) {
    return '<del>' + str + '</del>';
  })

  return md;
}

function createMessage (content) {
  const item = document.createElement('li');
  item.innerHTML = md2html(content);

  return item;
}

function setupChat() {
  function appendToList (child) {
    chatbox.appendChild(child);
    chatbox.scrollTop = chatbox.scrollHeight;
  }
  
  function sendMessage (message) {
    appendToList(createMessage(message));
    ws.send(message);
  }
  
  function sendTextMessage () {
    if (chatInput.value) {
      sendMessage(removeTags(chatInput.value));
      chatInput.value = '';
      updateNumberMessages(1);
    }
  }
  
  function updateNumberMessages(length) {
    numberMessages += length;
    chatSamp.textContent = numberMessages;
  }
  const chatbox = document.getElementById('chatbox'),
    chatInput = document.getElementById('chat-input'),
    chatSamp = document.getElementById('chat-samp');

  let incomingMessages = [],
    scheduled,
    prefix = '',
    numberMessages = 0;
  if (SUBDOMAIN !== 'localhost') {
    prefix = SUBDOMAIN + '_';
  }
  const protocol = prefix + window.location.pathname.replace(/\//g, '_');
  const ws = new WebSocket('wss://chat.shoogle.net/',  protocol);

  ws.onmessage = function(message) {
    incomingMessages.push(createMessage(message.data));

    if (!scheduled) {
      scheduled = true;
      window.requestAnimationFrame(function() {
        const frag = document.createDocumentFragment();
        for (let i = 0, len = incomingMessages.length; i < len; i++) {
          frag.appendChild(incomingMessages[i]);
        }
        appendToList(frag);
        updateNumberMessages(incomingMessages.length);
        incomingMessages.length = 0;
        scheduled = false;
      })
    }
  }

  document.getElementById('chat-btn').onclick = function() {
    sendTextMessage()
  };

  document.getElementById('chat-form').onkeypress = function(event) {
    if (event.keyCode === 13) {
      event.preventDefault();
      sendTextMessage();
    }
  };
}
// Shop open
function setupOpening() {
  const openingHours = document.getElementById('opening-hours');
  if (openingHours) {
    const opening = new SimpleOpeningHours(openingHours.textContent);
    // Translate
    openingHours.textContent = openingHours.textContent.replace('Mo', LANG.weekdays.Mo)
                                                       .replace('Tu', LANG.weekdays.Tu)
                                                       .replace('We', LANG.weekdays.We)
                                                       .replace('Th', LANG.weekdays.Th)
                                                       .replace('Fr', LANG.weekdays.Fr)
                                                       .replace('Sa', LANG.weekdays.Sa)
                                                       .replace('Su', LANG.weekdays.Su)
                                                       .replace('PH', LANG.weekdays.PH)
                                                       .replace('off', LANG.weekdays.off);
    if (opening.isOpen()) {
      // Append banner
      const openSamp = document.createElement('samp');
      openSamp.textContent = LANG.nowOpen;
      openingHours.appendChild(openSamp);
    }
  }
}
// Kickstart
// by loading language file
async function fetchLanguage() {
  const response = await fetch('/lang.json');
  LANG = await response.json();
}

function setup() {
  setupFilters();
  setupMap();
  setupSearch();
  setupChat();
  setupOpening();
}

setupButtons();
setupClickScroll();

fetchLanguage()
.then(function() {
  setup();
});
