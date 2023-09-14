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
    .replace(/[—']/g, '-') // Triple dash to single
    .replace(/[---]/g, '-') // Remove any leading single dash
    .replace(/^-{1,}/g, '') // Make the whole thing lowercase
    .toLowerCase() // Replace '&' with 'und'
    .replace(/[&]/g, 'et') // Replace accents
    .replace(/[çéâêîôûàèìòùëïü]/g, function (char) {
      var accents = {
        'ç': 'c',
        'é': 'e',
        'â': 'a',
        'ê': 'e',
        'î': 'i',
        'ô': 'o',
        'û': 'u',
        'à': 'a',
        'è': 'e',
        'ì': 'i',
        'ò': 'o',
        'ù': 'u',
        'ë': 'e',
        'ï': 'i',
        'ü': 'u'
      };
      return accents[char];
    });
  }

  if (typeof module !== 'undefined') {
    // For CommonJS default export support
    module.exports = slugo;
    module.exports.default = slugo;
  }

  return slugo;

})));
