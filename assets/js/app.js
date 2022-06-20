// Constants
const R = 6378;
const PI_360 = Math.PI / 360;

// Globals
// adopted from https://github.com/gabmontes/fast-haversine
window.calcDistance = function(lat1, lon1, lat2, lon2) {
  const cLat = Math.cos((lat1 + lat2) * PI_360);
  const dLat = (lat2 - lat1) * PI_360;
  const dLon = (lon2 - lon1) * PI_360;

  const f = dLat * dLat + cLat * cLat * dLon * dLon;
  const c = 2 * Math.atan2(Math.sqrt(f), Math.sqrt(1 - f));

  return R * c;
}

window.loadScript = function(file) {
  return new Promise(function(resolve, reject) {
    const script = document.createElement('script');
    script.async = false;
    script.src = document.baseURI + 'js/' + file;
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

window.getSubdomain = function() {
  return window.location.hostname.split(".")[0];
}

window.isElementVisible = function(element) {
  return !element.classList.contains('d-none') && !element.classList.contains('hide');
}

window.getEntries = function() {
  return window.listEntries = window.listEntries || query('li[data-lat]');
}

window.getGeolocationErrorMessage = function(error) {
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

  return message;
}
// Helpers
function query(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function flatten(array) {
  const newArray = [];
  for (let len = array.length, i = 0; i < len; i++) {
      for (let jarr = array[i], jen = jarr.length, j = 0; j < jen; j++) {
          newArray.push(jarr[j]);
      }
  }

  return newArray;
}

function isCategory(shop) {
  return shop[0] === '#';
}

function createLocation(pathname, shop) {
  return pathname + (shop ? isCategory(shop) ? shop : slugo(shop) + '/' : '');
}

function createPathName(city) {
  return '/' + city.customProperties.region + '/' + slugo(city.value) + '/';
}

function setInputFocus(instance) {
  instance.input.element.focus();
}

function updateCount(count, selector) {
  const filterSamp = document.querySelector('.filter-' + selector + ' samp');
  if (filterSamp) {
    filterSamp.textContent = count;
  }
}

function countVisibleItems(items) {
  let count = 0;
  items.forEach(function(item) {
    if (window.isElementVisible(item)) {
      count++;
    }
  });

  return count;
}

function appendLinkToHead(rel, href) {
  const link = document.createElement('link');
  link.rel = rel;
  link.href = href;
  document.head.appendChild(link);
}
// Async
async function fetchJSON(path) {
  const response = await fetch(path);
  return response.json();
}

async function fetchRegion(region) {
  const regionSlug = slugo(region);
  return fetchJSON('/' + regionSlug + '/index.json')
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

async function getCities() {
  return fetchJSON(document.baseURI + window.getSubdomain() + '.json')
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
// Kickstart
window.addEventListener('DOMContentLoaded', async function() {
  function clickCategory(category) {
    const name = category.replace('#', '').toLowerCase();
    for (let i = 0; i < categoryButtons.length; i++) {
      const button = categoryButtons[i];
      if (button.textContent.toLowerCase() === name) {
        button.click();
        break;
      }
    }
  }
  function showSecondColumn(alwaysShow) {
    alwaysShow ||
    secondColumn.getAttribute('data-empty') === 'false' ||
    secondColumn.getAttribute('data-button') === 'true' ?
    secondColumn.classList.remove('hidden') : secondColumn.classList.add('hidden') || setupColumns();
  }
  window.LANG = await fetchJSON(document.baseURI + 'lang.json');
  let secondColumn;
  let categoryButtons;
  
  // Buttons
  function setupButtons() {
    const categoryOpenButton = document.getElementById('categories-btn');
    if (categoryOpenButton) {
      categoryOpenButton.onclick = function() {
        categoryOpenButton.textContent = categoryOpenButton.textContent === '➕' ? '➖' : '➕';
        document.querySelector('.categories').classList.toggle('d-none');
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
            window.getEntries().forEach(function(entry) {
              entry.classList.remove('show');
              entry.classList.remove('hide');
            });
          }
          else {
            window.getEntries().forEach(function(entry) {
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
          updateCount(countVisibleItems(window.getEntries()), 'entries');
          if (window.vectorLayer) {
            window.updateMap();
          }
        }
      });
      // When everything is set up, respect category hash in URL
      const hash = window.location.hash;
      if (hash) {
        clickCategory(window.decodeURIComponent(hash));
      }
    }
  };
  // Chat
  async function setupChat() {
    let chatDetails = document.querySelector('#chat details');
    if (chatDetails) {
      chatDetails.onclick = function() {
        window.loadScript('chat.js');
        chatDetails = null;
      }
    }
  }
  // Columns
  function setupColumns() {
    secondColumn = query('.columns')[1];
    if (!secondColumn || secondColumn.getAttribute('data-listener') === 'true') {
      return;
    }
    const columnsWrapper = document.querySelector('.scrollable-box');
    if (columnsWrapper) {
      columnsWrapper.addEventListener('scroll', function (event) {
        const element = event.target;
        if (element.scrollHeight - element.scrollTop < element.clientHeight + 42) {
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
  };
  // Filters
  function setupFilters() {
    let filterInputs = query('.filter input');
    if (filterInputs) {
      let categories;
      function getCategories() {
        return categories = categories || query('.categories button, .categories a');
      }
      
      function updateGUI(value, filter) {
        const items = filter === 'entries' ? window.getEntries() : getCategories();
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
        if (window.vectorLayer) {
            window.updateMap();
        }
      }
      
      function startCategoriesFilter(value) {
        updateGUI(value, 'categories');
      }
      
      function debounce(fn, duration) {
        let timer;
      
        return function () {
          window.clearTimeout(timer);
          timer = window.setTimeout(fn, duration);
        }
      }
      filterInputs.forEach(function(input) {
        const isEntriesFilter = input.closest('.filter-entries');
        const startFilter = isEntriesFilter ? startEntriesFilter : startCategoriesFilter;
        input.addEventListener('input', debounce(function () {
          updateCount(window.LANG.loading, isEntriesFilter ? 'entries' : 'categories');
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
      // Cleanup
      filterInputs = null;
    }
  }
  // Map
  function setupMap() {
    let mapButton = document.querySelector('#map button');
    if (mapButton) {
      mapButton.onclick = async function() {
        // Preconnect to OSM early
        const tiles = ['a', 'b', 'c'];
        tiles.forEach(function(tile) {
          appendLinkToHead('preconnect', 'https://' + tile + '.tile.openstreetmap.org');
        });
        // Hide buttons and overlay and add loader
        const parent = mapButton.parentNode;
        for (let i = 0; i < 3; i++) {
          parent.children[i].style.display = 'none';
        }
        parent.classList.remove('is-overlay');
        parent.classList.add('loading');

        // Load OSM map library
        await Promise.all([
          window.loadScript('OpenLayers.js'),
          window.loadScript('map.js')
        ]);
        // Cleanup
        parent.classList.remove('loading');
        mapButton = null;
      };
    }
  }
  // Opening
  async function setupOpening() {
    window.openingHours = document.getElementById('opening-hours');
    if (window.openingHours) {
      await Promise.all([
        window.loadScript('simple-opening-hours.js'),
        window.loadScript('opening.js')
      ]);
    }
  }
  // Search
  function setupSearch() {
    let cities = document.getElementById('cities');
    if (cities) {
      // Cities
      new Choices(cities, {
        placeholderValue: window.LANG.choose,
        searchFields: ['value'],
        searchPlaceholderValue: window.LANG.search,
        loadingText: window.LANG.loading,
        noResultsText: window.LANG.noResultsFound,
        itemSelectText: '+',
        noChoicesText: window.LANG.withAtLeastThreeLetters,
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
                setInputFocus(instance);
            });
        }, { once: true });
        let city;
        let pathname;
        let shop;
        instance.passedElement.element.addEventListener('change', function() {
            city = instance.getValue();
            pathname = createPathName(city);
            appendLinkToHead('prefetch', pathname);
            searchButton.disabled = false;
            shopsChoices.clearStore();
            shopsChoices.setChoices(function() {
                return new Promise(function (resolve) {
                    resolve();
                });
            })
            .then(function(instance2) {
                instance2.containerOuter.element.addEventListener('click', function() {
                    shopsChoices.setChoices(async function() {
                        return fetchJSON(createPathName(city) + 'index.json')
                        .then(function(data) {
                            return data.map(function(item) {
                                return {
                                    value: item,
                                    label: item
                                };
                            });
                        });
                    })
                    .then(function() {
                        // We have to re-set focus on input again
                        setInputFocus(instance2);
                    });
                }, { once: true });
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
                if (window.location.pathname === pathname && isCategory(shop)) {
                    // We're on the right page already, only scroll to category
                    clickCategory(shop);
                }
                else {
                    // Relocate to new location
                    window.location = createLocation(pathname, shop);
                }
            };
        }
      });
      // Shops
      const shopsChoices = new Choices(document.getElementById('shops'), {
        placeholderValue: window.LANG.choose,
        searchFields: ['value'],
        searchPlaceholderValue: window.LANG.filter,
        loadingText: window.LANG.loading,
        noResultsText: window.LANG.noResultsFound,
        itemSelectText: '+',
        shouldSort: true,
        renderChoiceLimit : 100,
        searchResultLimit: 100,
        searchFloor: 1,
        position: 'bottom'
      }).disable();
      // Position button
      const positionButton = document.getElementById('position-btn');
      if (positionButton) {
        positionButton.onclick = function() {
          if (navigator.geolocation) {
            positionButton.disabled = true;
            positionButton.classList.add('loading');
                
            navigator.geolocation.getCurrentPosition(function (position) {
              // Fetch cities
              getCities()
              .then(function (cities) {
                // Calc nearest entry
                let nearstEntry;
                let minimumDistance = 10000;
                for (let i = 0; i < cities.length; i++) {
                  const entry = cities[i];
                  const result = window.calcDistance(
                    position.coords.latitude,
                    position.coords.longitude,
                    parseFloat(entry.customProperties.lat),
                    parseFloat(entry.customProperties.lon));
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
            }, function(error) {
              alert(getGeolocationErrorMessage(error));
              positionButton.disabled = false;
              positionButton.classList.remove('loading');
            },
            { timeout: 5000 });
          }
          else {
            alert(LANG.geolocationAlert);
          }
        }
      }
      // Cleanup
      cities = null;
    }
  }
  setupSearch();
  setupOpening();
  setupMap();
  setupFilters();
  setupColumns();
  setupChat();
  setupButtons();
});
