'use strict';

/* Filters */

angular.module('TM470.filters', []).
  filter('interpolate', function (version) {
    return function (text) {
      return String(text).replace(/\%VERSION\%/mg, version);
    };
  }).
  filter('dateFilter', function() {
    return function(input, format) {
      var aMoment = moment(input);
       // http://momentjs.com/docs/#/displaying/format/
      return aMoment.format(format);
    }
  }).
  filter('timeAgo', function() {
    return function(input,future) {
       var aMoment = moment(input);
       if(future){
          return aMoment.toNow(true);
       }
       else{
          return aMoment.fromNow();
       }
    }
  });
