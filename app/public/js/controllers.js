'use strict';

/* Controllers */

angular.module('TM470.controllers', []).
  controller('mainController', function ($scope) {
    // write Ctrl here

  }).
  controller('BodyController', function($scope) {
   $scope.ngsuccess = function(input) {
      success(input);
   }
   $scope.ngfailure = function(input) {
      failure(input);
   }
  }).
  controller('loginController', function($scope) {
   
  }).
  controller('eventsController', ['$scope', '$http',
  function ($scope, $http) {
    $http.get("/api/events")
    .then(function(response) {
      //$scope.names = response.data.records;
      //console.log(response.data.results);
      $scope.eventlist = response.data.results;
    //$scope.orderProp = 'created';
    });
  }]).
  controller('eventController', ['$scope', '$routeParams', '$http',
  function($scope, $routeParams, $http) {
    $scope.itemId = $routeParams.itemId;
    $http.get("/api/events/" + $scope.itemId)
    .then(function(response) {
      //$scope.names = response.data.records;
      $scope.project = response.data;
    });
  }]);
