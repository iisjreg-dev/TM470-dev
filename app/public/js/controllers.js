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
        //$location.path("/");
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
  controller('mainController', function ($scope) {

  }).
  controller('loginController', function($scope) {
   
  }).
  controller('signupController', function($scope) {
   
  }).
  controller('accountController', function ($scope, $http, $location) {
    if(!$scope.user){
      $location.path("/login");
    }
    $scope.newpassword = {};
    $scope.submitForm = function() {
      if(($scope.newpassword.first == $scope.newpassword.second) && $scope.newpassword.second){
        console.log("changing password");
        $scope.user.password = $scope.newpassword.second;
      }
      console.log("updating");
      //console.log($scope.user);
      $http.post("/auth/update", $scope.user)
        .then(function(data) {
          console.log(data.status);
          if(data.status == 200){
            success("Details updated");
            
            //UPDATE AUTH?
          }
          //$scope.message = data.message;
        }, function(err){
          console.log("update error: ");
          console.log(err);
        });
    };  
  }).
  controller('eventsController', ['$scope', '$http', '$location',
  function ($scope, $http, $location) {
    $http.get("/api/events")
    .then(function(response) {
      console.log(response.status);
      $scope.eventlist = response.data.results;
    //$scope.orderProp = 'created';
    }, function(error){
      console.log(error.data);
      $location.path("/login");
      //show login
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
