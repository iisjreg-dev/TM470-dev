'use strict';

/* Controllers */

angular.module('TM470.controllers', []).
  controller('BodyController', ['$scope', '$http', '$location',
  function($scope, $http, $location) {
    
    //AUTH
    $http.get("/auth/user")
    .then(function(response) {
        console.log("auth success");
        //console.log(response.status);
        //console.log(response);
        $scope.user = response.data;
        $scope.showlogin = false;

    }, function(error){
        //console.log("auth service fail");
        console.log(error.data);
        $scope.showlogin = true;
        $location.path("/");
    });


    $scope.ngsuccess = function(input) {
      success(input); //reference to javascript function
    }
    $scope.ngfailure = function(input) {
      failure(input);
    }
    
    
    $scope.logout = function(){
      $http.get("/auth/logout")
      .then(function(response) {
        console.log("logged out");
        $scope.user = null;
        $scope.showlogin = true;
        $location.path("/");
    }, function(error){
        console.log("logout fail");
        console.log(error.data);
        
    });
    }
    
  }]).
  controller('loginController', function($scope) {
   
  }).
  controller('eventsController', ['$scope', '$http',
  function ($scope, $http) {
    $http.get("/api/events")
    .then(function(response) {
      console.log(response.status);
      //console.log(response);
      //if(response.statusCode)
      //$scope.names = response.data.records;
      //console.log(response.data.results);
      $scope.eventlist = response.data.results;
    //$scope.orderProp = 'created';
    }, function(error){
      console.log(error.data);
      //show login
    });
  }]).
  controller('mainController', function ($scope) {
    // write Ctrl here

  }).
  controller('eventController', ['$scope', '$routeParams', '$http',
  function($scope, $routeParams, $http) {
    $scope.itemId = $routeParams.itemId;
    $http.get("/api/events/" + $scope.itemId)
    .then(function(response) {
      //$scope.names = response.data.records;
      $scope.project = response.data;
    });
  }]);
