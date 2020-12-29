var SimpleOpeningHours = /** @class */ (function () {
    /**
     * Creates the OpeningHours Object with OSM opening_hours string
     */
    function SimpleOpeningHours(input) {
        this.parse(input);
    }
    SimpleOpeningHours.prototype.isOpen = function (date) {
        var _this = this;
        if (typeof this.openingHours === "boolean") {
            return this.openingHours;
        }
        date = date || new Date();
        var testDay = date.getDay();
        var testTime = date.getHours() + ":" + (date.getMinutes() < 10 ? ("0" + date.getMinutes()) : date.getMinutes());
        var i = 0;
        var times;
        for (var key in this.openingHours) {
            if (i == testDay) {
                times = this.openingHours[key];
            }
            i++;
        }
        var isOpen = false;
        times.some(function (time) {
            var timeData = time.replace(/\+$/, "-24:00").split("-");
            if ((_this.compareTime(testTime, timeData[0]) != -1)
                && (_this.compareTime(timeData[1], testTime) != -1)) {
                isOpen = true;
                return true;
            }
        });
        return isOpen;
    };
    /**
     * Parses the input and creates openingHours Object
     */
    SimpleOpeningHours.prototype.parse = function (input) {
        var _this = this;
        if (/^\s*24\s*?\/\s*?7\s*$/.test(input)) {
            this.openingHours = {
                mo: ["00:00-24:00"],
                tu: ["00:00-24:00"],
                we: ["00:00-24:00"],
                th: ["00:00-24:00"],
                fr: ["00:00-24:00"],
                sa: ["00:00-24:00"],
                su: ["00:00-24:00"],
                ph: ["00:00-24:00"]
            };
            this.alwaysOpen = true;
            return;
        }
        else if (/^.*[0-9]{2}:[0-9]{2}\s*off.*$/.test(input)) {
            this.init();
            return this.parseClosingHours(input);
        }
        else if (/^\s*off\s*$/.test(input)) {
            this.openingHours = false;
            this.alwaysClosed = true;
            return;
        }
        this.init();
        var parts = input.toLowerCase().replace(/\s*([-:,;])\s*/g, '$1').split(";");
        parts.forEach(function (part) {
            _this.parseHardPart(part);
        });
    };
    SimpleOpeningHours.prototype.parseClosingHours = function (input) {
        var tempData = {
            su: [],
            mo: [],
            tu: [],
            we: [],
            th: [],
            fr: [],
            sa: [],
            ph: []
        };
        var univStart;
        var univEnd;
        var parts = input.toLowerCase().split(";");
        var _loop_1 = function (p) {
            parts[p] = parts[p].trim();
            var segments = parts[p].split(' ');
            var days = void 0;
            var openTimes = [];
            // If part has the closing hours.
            if (parts[p].indexOf('off') !== -1) {
                // If no start or end time is found yet, add part to the end of the list.
                if (univStart == undefined || univEnd == undefined) {
                    parts.push(parts[p]);
                }
                else {
                    days = this_1.parseDays(segments[0]);
                    var closeTimes = [];
                    // Split closing times into array of times.
                    // parts[0]: days, parts[last]: 'off'
                    for (var i = 1; i < segments.length - 1; i++) {
                        segments[i] = segments[i].replace(',', '');
                        var tmp = segments[i].split('-');
                        closeTimes.push(tmp[0]);
                        closeTimes.push(tmp[1]);
                    }
                    // Switch closing hours to opening hours.
                    for (var i = 0; i < closeTimes.length; i++) {
                        if (i == 0) {
                            openTimes.push(univStart + "-" + closeTimes[i]);
                        }
                        else if (i == closeTimes.length - 1) {
                            openTimes.push(closeTimes[i] + "-" + univEnd);
                        }
                        else {
                            openTimes.push(closeTimes[i] + "-" + closeTimes[++i]);
                        }
                    }
                    days.forEach(function (day) {
                        tempData[day] = openTimes;
                    });
                }
                // If part has the universal opening hours.
            }
            else if (segments.length == 1) {
                var tmp = parts[p].split('-');
                univStart = tmp[0];
                univEnd = tmp[1];
                for (var key in tempData) {
                    tempData[key].push(parts[p]);
                }
                // If part has basic opening hours.
            }
            else {
                var days_1 = this_1.parseDays(segments[0]);
                openTimes.push(segments[1]);
                days_1.forEach(function (day) {
                    tempData[day] = openTimes;
                });
            }
        };
        var this_1 = this;
        for (var p = 0; p < parts.length; p++) {
            _loop_1(p);
        }
        for (var key in tempData) {
            this.openingHours[key] = tempData[key];
        }
    };
    SimpleOpeningHours.prototype.parseHardPart = function (part) {
        var _this = this;
        if (part == "24/7") {
            part = "mo-su 00:00-24:00";
        }
        var segments = part.split(/\ |\,/);
        var tempData = {};
        var days = [];
        var times = [];
        segments.forEach(function (segment) {
            if (_this.checkDay(segment)) {
                if (times.length == 0) {
                    days = days.concat(_this.parseDays(segment));
                }
                else {
                    //append
                    days.forEach(function (day) {
                        if (tempData[day]) {
                            tempData[day] = tempData[day].concat(times);
                        }
                        else {
                            tempData[day] = times;
                        }
                    });
                    days = _this.parseDays(segment);
                    times = [];
                }
            }
            if (_this.isTimeRange(segment)) {
                if (segment == "off") {
                    times = [];
                }
                else {
                    times.push(segment);
                }
            }
        });
        //commit last times to it days
        days.forEach(function (day) {
            if (tempData[day]) {
                tempData[day] = tempData[day].concat(times);
            }
            else {
                tempData[day] = times;
            }
        });
        //apply data to main obj
        for (var key in tempData) {
            this.openingHours[key] = tempData[key];
        }
    };
    SimpleOpeningHours.prototype.parseDays = function (part) {
        var _this = this;
        var days = [];
        var softparts = part.split(',');
        softparts.forEach(function (part) {
            var rangecount = (part.match(/\-/g) || []).length;
            if (rangecount == 0) {
                days.push(part);
            }
            else {
                days = days.concat(_this.calcDayRange(part));
            }
        });
        return days;
    };
    SimpleOpeningHours.prototype.init = function () {
        this.openingHours = {
            su: [],
            mo: [],
            tu: [],
            we: [],
            th: [],
            fr: [],
            sa: [],
            ph: []
        };
    };
    /**
     * Calculates the days in range "mo-we" -> ["mo", "tu", "we"]
     */
    SimpleOpeningHours.prototype.calcDayRange = function (range) {
        var def = {
            su: 0,
            mo: 1,
            tu: 2,
            we: 3,
            th: 4,
            fr: 5,
            sa: 6
        };
        var rangeElements = range.split('-');
        var dayStart = def[rangeElements[0]];
        var dayEnd = def[rangeElements[1]];
        var numberRange = this.calcRange(dayStart, dayEnd, 6);
        var outRange = [];
        numberRange.forEach(function (n) {
            for (var key in def) {
                if (def[key] == n) {
                    outRange.push(key);
                }
            }
        });
        return outRange;
    };
    /**
     * Creates a range between two number.
     * if the max value is 6 a range bewteen 6 and 2 is 6, 0, 1, 2
     */
    SimpleOpeningHours.prototype.calcRange = function (min, max, maxval) {
        if (min == max) {
            return [min];
        }
        var range = [min];
        var rangepoint = min;
        while (rangepoint < ((min < max) ? max : maxval)) {
            rangepoint++;
            range.push(rangepoint);
        }
        if (min > max) {
            //add from first in list to max value
            range = range.concat(this.calcRange(0, max, maxval));
        }
        return range;
    };
    /**
     * Check if string is time range
     */
    SimpleOpeningHours.prototype.isTimeRange = function (input) {
        //e.g. 09:00+
        if (input.match(/[0-9]{1,2}:[0-9]{2}\+/)) {
            return true;
        }
        //e.g. 08:00-12:00
        if (input.match(/[0-9]{1,2}:[0-9]{2}\-[0-9]{1,2}:[0-9]{2}/)) {
            return true;
        }
        //off
        if (input.match(/off/)) {
            return true;
        }
        return false;
    };
    /**
     * check if string is day or dayrange
     */
    SimpleOpeningHours.prototype.checkDay = function (input) {
        var days = ["mo", "tu", "we", "th", "fr", "sa", "su", "ph"];
        if (input.match(/\-/g)) {
            var rangeElements = input.split('-');
            if (days.indexOf(rangeElements[0]) !== -1
                && days.indexOf(rangeElements[1]) !== -1) {
                return true;
            }
        }
        else if (days.indexOf(input) !== -1) {
            return true;
        }
        return false;
    };
    /**
     * Compares to timestrings e.g. "18:00"
     * if time1 > time2 -> 1
     * if time1 < time2 -> -1
     * if time1 == time2 -> 0
     */
    SimpleOpeningHours.prototype.compareTime = function (time1, time2) {
        var date1 = Number(time1.replace(":", ""));
        var date2 = Number(time2.replace(":", ""));
        if (date1 > date2) {
            return 1;
        }
        else if (date1 < date2) {
            return -1;
        }
        else {
            return 0;
        }
    };
    return SimpleOpeningHours;
}());
//# sourceMappingURL=simple-opening-hours.js.map