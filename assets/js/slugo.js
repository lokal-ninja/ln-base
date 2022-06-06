(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global.slugo = factory());
}(this, (function () { 'use strict';

  function slugo(input) {
    return input // Remove html tags
    .replace(/<(?:.|\n)*?>/gm, '') // Remove special characters
    .replace(/[!\"#$%\(\)\*\+,\/:;<=>\?\@\[\\\]\^`\{\|\}~]/g, '') // eslint-disable-line no-useless-escape
    // Replace dots and spaces with a short dash
    .replace(/(\s|\.)/g, '-') // Replace long dash with a single dash
    .replace(/[—']/g, '-') // Remove any leading single dash
    .replace(/^-{1,}/g, '') // Make the whole thing lowercase
    .toLowerCase() // Replace '&' with 'und'
    .replace(/[&]/g, 'and') // Replace Umlauts
    .replace(/[ÄäÖöÜü]/g, function (char) {
      var umlauts = {
        'ä': 'ae',
        'ö': 'oe',
        'ü': 'ue'
      };
      return umlauts[char];
    });
  }

  if (typeof module !== 'undefined') {
    // For CommonJS default export support
    module.exports = slugo;
    module.exports.default = slugo;
  }

  return slugo;

})));
