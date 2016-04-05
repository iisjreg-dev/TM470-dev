'use strict';

/* Controllers */

angular.module('TM470.controllers', []).
  controller('BodyController', ['$scope', '$http', '$location',
  function($scope, $http, $location) {
    // if(!$scope.user){ //NEED TO FIX - USER IS NOT SET BY THE TIME THE PAGE LOADS???
    //   $location.path("/login");
    // }
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
      success(input); //reference to notie javascript function
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
        success("Logged out");
        $location.path("/");
    }, function(error){
        console.log("logout fail");
        console.log(error.data);
        failure("Could not logout");
        
    });
    }
    
  }]).
  controller('mainController', function ($scope) {

  }).
  controller('loginController', function($scope) {
   
  }).
  controller('signupController', function($scope, $http, $location, $window) {
    $scope.checkUser = function() {
      $scope.checkingUser = true;
      $http.get("/auth/checkuser/" + $scope.user.username)
        .then(function(data) {
          console.log(data.status);
          if(data.status == 200){
            $scope.checkingUser = false;
            $scope.userOK = true;
            $scope.userNotOK = false;
          }
        }, function(err){
          //console.log("usercheck error");
          console.log(err.status);
          $scope.checkingUser = false;
          $scope.userOK = false;
          $scope.userNotOK = true;
        });
    }

    $scope.submitForm = function() {
      console.log("signing up");
      //console.log($scope.user);
      $http.post("/auth/signup", $scope.user)
        .then(function(data) {
          console.log(data.status);
          if(data.status == 200){
            
            success("Signed up"); 
            $location.path("/account");
            location.reload();
            //UPDATE AUTH?
          }
          //$scope.message = data.message;
        }, function(err){
          console.log("sign up error: ");
          console.log(err);
          failure("Could not sign up: " + err); 
          //$location.path("/login");
        });
    };
  }).
  controller('aboutController', function($scope) {
   
  }).
  controller('accountController', function ($rootScope, $scope, $http, $location) {
 
    $scope.newpassword = {};
    $scope.updateName = $scope.name;
    $scope.submitForm = function() {
      if(($scope.newpassword.first == $scope.newpassword.second) && $scope.newpassword.second){
        console.log("changing password");
        $scope.user.password = $scope.newpassword.second;
      }
      console.log("updating");
      //console.log($scope.user);
      $http.post("/auth/update", $scope.user)
        .then(function(data) {
          //console.log(data.status);
          if(data.status == 200){
            
            success("Details updated");
            console.log($scope); 
            console.log($scope.user.name); 
            //console.log($scope.$parent);
            //$scope.$parent.user.name = $scope.user.updateName;
            //$scope.user.name = $scope.user.name;
            //console.log($scope.$parent.user.name);
            //UPDATE AUTH?
          }
          //$scope.message = data.message;
        }, function(err){
          console.log("update error: ");
          console.log(err);
          failure("Not logged in"); 
          $location.path("/login");
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
