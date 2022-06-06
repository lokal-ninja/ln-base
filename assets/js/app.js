// Globals
let categories;
let entries;
let epsg4326;
let projectTo;
let vectorLayer;
let citiesChoices;
let shopsChoices;
let categoryButtons;
let secondColumn;

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

function query(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function getEntries() {
  return entries ? entries : entries = query('li[data-lat]');
}

function getCategories() {
  return categories ? categories : categories = query('.categories button, .categories a');
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
// Filter input
function setupColumns() {
  if (!secondColumn) {
    secondColumn = query('.columns')[1];
  }
  if (secondColumn.getAttribute('data-listener') === 'true') {
    return;
  }
  const columnsWrapper = document.querySelector('.scrollable-box');
  if (columnsWrapper) {
    columnsWrapper.addEventListener('scroll', function (event) {
      const element = event.target;
      if (element.scrollHeight - element.scrollTop < element.clientHeight + 1) {
          // Scrolled to bottom
          // Had to fix by +1 because columnsWrapper has a (potential) hidden sibling with 1px height
          secondColumn.setAttribute('data-listener', 'false');
          event.target.removeEventListener(event.type, arguments.callee);
          showSecondColumn(true);
      }
    },
    { passive: true });
    secondColumn.setAttribute('data-listener', 'true');
  }
}

function showSecondColumn(alwaysShow) {
  alwaysShow ||
  secondColumn.getAttribute('data-empty') === 'false' ||
  secondColumn.getAttribute('data-button') === 'true' ?
  secondColumn.classList.remove('hidden') : secondColumn.classList.add('hidden') || setupColumns();
}

function isElementVisible(element) {
  return !element.classList.contains('d-none') && !element.classList.contains('hide');
}

function updateCount(count, selector) {
  const filterSamp = document.querySelector('.filter-' + selector + ' samp');
  if (filterSamp) {
    filterSamp.textContent = count;
  }
}

function updateMap() {
  if (vectorLayer) {
    const matches = [];
    vectorLayer.features.forEach(function(feature) {
      const entry = feature.attributes.entry;
      if (entry) {
        if (isElementVisible(entry)) {
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
      vectorLayer.map.setCenter(createLonLat(center[1], center[0]), determineZoom(matches, count, center));
    }
    vectorLayer.redraw();
  }
}

function countVisibleItems(items) {
  let count = 0;
  items.forEach(function(item) {
    if (isElementVisible(item)) {
      count++;
    }
  });

  return count;
}

function debounce(fn, duration) {
  let timer;

  return function () {
    clearTimeout(timer);
    timer = setTimeout(fn, duration);
  }
}

function updateGUI(value, filter) {
  const items = filter === 'entries' ? getEntries() : getCategories();
  const regex = new RegExp(value, 'i');
  items.forEach(function(item) {
    value === '' || regex.test(item.textContent) ? item.classList.remove('d-none') : item.classList.add('d-none');
  });
  updateCount(countVisibleItems(items), filter);
}

function startEntriesFilter(value) {
  secondColumn.setAttribute('data-empty', value === '');
  showSecondColumn(false);
  updateGUI(value, 'entries');
  updateMap();
}

function startCategoriesFilter(value) {
  updateGUI(value, 'categories');
}

function setupFilters() {
  const filterInputs = query('.filter input');
  filterInputs.forEach(function(input) {
    const isEntriesFilter = input.closest('.filter-entries');
    const startFilter = isEntriesFilter ? startEntriesFilter : startCategoriesFilter;
    input.addEventListener('input', debounce(function () {
      updateCount('Loading...', isEntriesFilter ? 'entries' : 'categories');
    }, 250));
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
  const categoryOpenButton = document.getElementById('categories-btn');
  if (categoryOpenButton) {
    categoryOpenButton.onclick = function () {
      categoryOpenButton.textContent = categoryOpenButton.textContent === '➕' ? '➖' : '➕';
      document.querySelector('.categories').classList.toggle('d-none');
    }
  }
  categoryButtons = query('.categories button');
  categoryButtons.forEach(function(button) {
    button.onclick = function () {
      button.classList.toggle('active');

      // Any other category buttons active?
      let categoryButtonActive = false;
      const length = categoryButtons.length;
      for (let i = 0; i < length; i++) {
        if (categoryButtons[i].classList.contains('active')) {
          categoryButtonActive = true;
          break;
        }
      }
      secondColumn.setAttribute('data-button', categoryButtonActive);
      showSecondColumn(false);
      if (!categoryButtonActive) {
        getEntries().forEach(function(entry) {
          entry.classList.remove('show');
          entry.classList.remove('hide');
        });
      }
      else {
        getEntries().forEach(function(entry) {
          if (entry.dataset.shop === button.textContent) {
            if (button.classList.contains('active')) {
              entry.classList.remove('hide');
              entry.classList.add('show');
            }
            else {
              entry.classList.remove('show');
              entry.classList.add('hide');
            }
          }
          else if (!entry.classList.contains('show')) {
            entry.classList.add('hide');
          }
        });
      }
      updateCount(countVisibleItems(getEntries()), 'entries');
      updateMap();
    }
  });
  const positionButton = document.getElementById('position-btn');
  if (positionButton) {
    positionButton.onclick = function () {
      if (navigator.geolocation) {
        positionButton.disabled = true;
        positionButton.classList.add('loading');

        navigator.geolocation.getCurrentPosition(function (position) {
          // Fetch cities
          const promise = getCities();
          promise.then(function (cities) {
            // Calc nearest entry
            let nearstEntry;
            let minimumDistance = 10000;
            for (let i = 0; i < cities.length; i++) {
              const entry = cities[i];
              const result = distance(
                position.coords.latitude,
                position.coords.longitude,
                parseFloat(entry.customProperties.lat),
                parseFloat(entry.customProperties.lon)
              );
              if (result < minimumDistance) {
                minimumDistance = result;
                nearstEntry = entry;
                if (minimumDistance < 1) {
                  break;
                }
              }
            }
            // Relocate
            window.location = createPathName(nearstEntry);
          });
        });
      }
      else {
        geolocationAlert();
      }
    }
  }
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

  getEntries().forEach(function(entry) {
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
  locateButton.classList.remove('d-none'); // Dont forget to show
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

function appendLinkToHead (rel, href) {
  const link = document.createElement('link');
  link.rel = rel;
  link.href = href;
  document.head.appendChild(link);
}

function setupMap() {
  const mapButton = document.querySelector('#map button');
  if (mapButton) {
    mapButton.onclick = function () {
      // Preconnect to OSM early
      const tiles = ['a', 'b', 'c'];
      tiles.forEach(function(tile) {
        appendLinkToHead('preconnect', 'https://' + tile + '.tile.openstreetmap.org');
      });
      // Load OSM map library
      loadScript('OpenLayers.js')
      .then(function() {
        buildMap();
      });
      // Hide buttons and overlay and add loader
      const parent = mapButton.parentNode;
      for (let i = 0; i < 3; i++) {
        parent.children[i].style.display = 'none';
      }
      parent.classList.remove('is-overlay');
      parent.classList.add('loading');
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
      //button.scrollIntoView();
      break;
    }
  }
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
        value: item.name,
        label: item.name + ', ' + region,
        customProperties: {
          region: regionSlug,
          lat: item.lat,
          lon: item.lon
        }
      };
    });
  })
  .catch(function(error) {
    console.error(error);
  });
}

function flatten (array) {
  const newArray = [];
  for (let len = array.length, i = 0; i < len; i++) {
    for (let jarr = array[i], jen = jarr.length, j = 0; j < jen; j++) {
      newArray.push(jarr[j]);
    }
  }

  return newArray;
}

async function getCities () {
  return fetchRegions()
  .then(async function(regions) {
    const promises = regions.map(function(region) {
      return fetchRegion(region);
    });
    return Promise.all(promises)
    .then(function(result) {
      return flatten(result);
    })
    .catch(function(error) {
      console.error(error);
    })
  })
}

function isCategory (shop) {
  return shop[0] === '#';
}

function createLocation (pathname, shop) {
  return pathname + (shop ? isCategory(shop) ? shop : slugo(shop) + '/' : '');
}

function createPathName (city) {
  return '/' + city.customProperties.region + '/' + slugo(city.value) + '/';
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
      shouldSort: true,
      renderChoiceLimit : 0,
      searchResultLimit: 100,
      searchFloor: 3,
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
          return getCities();
        })
        .then(function() {
          // We have to re-set focus on input again
          instance.input.element.focus();
        });
      }, { once: true });
      let city;
      let pathname;
      let shop;
      instance.passedElement.element.addEventListener('change', function(e) {
        city = instance.getValue();
        pathname = createPathName(city);
        appendLinkToHead('prefetch', pathname);
        searchButton.disabled = false;
        shopsChoices.clearStore();
        shopsChoices.setChoices(async function() {  
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
        })
        .then(function(instance2) {
          instance2.passedElement.element.addEventListener('change', function() {
            shop = shopsChoices.getValue(true);
            appendLinkToHead('prefetch', createLocation(pathname, shop));
          });
        });
        shopsChoices.enable();
      });
      const searchButton = document.getElementById('search-btn');
      if (searchButton) {
        searchButton.onclick = function () {
          if (window.location.pathname === pathname) {
            if (isCategory(shop)) {
              // We're on the right page already, only scroll to category
              clickScrollCategory(shop);
            }
          }
          else {
            // Relocate to new location
            window.location = createLocation(pathname, shop);
          }
        };
      }
    });
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
      shouldSort: true,
      renderChoiceLimit : 100,
      searchResultLimit: 100,
      searchFloor: 1,
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

  const chatBtn = document.getElementById('chat-btn');
  if (chatBtn) {
    chatBtn.onclick = function() {
      sendTextMessage();
    };
  }

  const chatForm = document.getElementById('chat-form');
  if (chatForm) {
    chatForm.onkeypress = function(event) {
      if (event.keyCode === 13) {
        event.preventDefault();
        sendTextMessage();
      }
    };
  }
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

window.addEventListener('DOMContentLoaded', function() {
  fetchLanguage()
  .then(function() {
    setupButtons();
    setupChat();
    setupColumns();
    setupFilters();
    setupMap();
    setupOpening();
    setupSearch();

    // When everything is set up, respect category hash in URL
    const hash = window.location.hash;
    if (hash) {
      clickScrollCategory(decodeURIComponent(hash));
    }
  });  
});
