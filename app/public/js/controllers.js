'use strict';

/* Controllers */

angular.module('TM470.controllers', []).
  controller('BodyController', ['$scope', '$http', '$location', //INDEX.HTML - AVAILABLE ON ALL PAGES
  function($scope, $http, $location) {
    // if(!$scope.user){ //NEED TO FIX - USER IS NOT SET BY THE TIME THE PAGE LOADS???
    //   $location.path("/login");
    // }
    //AUTH
    $http.get("/auth/user")
    .then(function(response) {
        console.log("auth success");
        $scope.user = response.data;
        $scope.showlogin = false;

    }, function(error){
        //console.log("auth service fail");
        console.log(error.data);
        $scope.showlogin = true;
        //$location.path("/");
    });

    //reference to notie.js javascript functions for use in template pages 
    $scope.ngsuccess = function(input) {
      success(input); 
    }
    $scope.ngfailure = function(input) {
      failure(input);
    }
    
    //AJAX logout
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
  controller('mainController', function ($scope) { //MAIN.HTML - mainly used for testing -- will eventual be a 'dashboard'

  }).
  controller('loginController', function($scope) { //LOGIN.HTML - TODO: need to make login use AJAX
   
  }).
  controller('signupController', function($scope, $http, $location, $window) { //SIGNUP.HTML
  
    //Live username checking - TODO: add tooltips/more info to result
    $scope.checkUser = function() {
      if($scope.user.username){
        $scope.checkingUser = true;
        $http.get("/auth/checkuser/" + encodeURIComponent($scope.user.username))
          .then(function(data) {
            console.log(data.status);
            if(data.status == 200){
              $scope.checkingUser = false;
              $scope.userOK = true;
              $scope.userNotOK = false;
            }
            else{
              console.log("not available");
              console.log(data.status);
              $scope.checkingUser = false;
              $scope.userOK = false;
              $scope.userNotOK = true;
            }
          }, function(err){
            //console.log("usercheck error");
            console.log(err.status);
            $scope.checkingUser = false;
            $scope.userOK = false;
            $scope.userNotOK = true;
          });
      }
    }
    
    //SIGNUP SUBMIT
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
        }, function(err){
          console.log("sign up error: ");
          console.log(err);
          failure("Could not sign up: " + err); 
          //$location.path("/login");
        });
    };
  }).
  controller('aboutController', function($scope) { //ABOUT.HTML - no controller needed yet
   
  }).
  controller('accountController', function ($rootScope, $scope, $http, $location) { //ACCOUNT.HTML - updating user details and password
 
    $scope.newpassword = {};
    $scope.updateName = $scope.name;
    $scope.submitForm = function() {
      if(($scope.newpassword.first == $scope.newpassword.second) && $scope.newpassword.second){
        console.log("changing password");
        $scope.user.password = $scope.newpassword.second;
      }
      else{
        if($scope.newpassword.first != $scope.newpassword.second){
          failure("Please confirm password");
        }
      }
      console.log("updating user");
      $http.post("/auth/update", $scope.user)
        .then(function(data) {
          //console.log(data.status);
          if(data.status == 200){
            success("Details updated");
            console.log($scope.user.name); 
            //UPDATE AUTH?
          }
        }, function(err){
          console.log("update error: ");
          console.log(err);
          failure("Not logged in"); //TODO: Check
          $location.path("/login");
        });
    };  
  }).
  controller('eventsController', ['$scope', '$http', '$location', //EVENTS.HTML
  function ($scope, $http, $location) {
    $scope.event = {};
    $scope.showAddEvent = false;
    
    //Load event list
    function getEvents(){
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
    }
    getEvents();
    
    $scope.addEvent = function(){
      $scope.event = {}; //clear addEvent form
      $scope.showAddEvent = true;
    };
    
    $scope.go = function(key){
      console.log("/events/" + key);
      $location.path("/events/" + key);
    }
    
    $scope.submitForm = function(){
      if($scope.event.name && $scope.event.description && $scope.event.date && $scope.event.time){ //all fields completed
        $http.post("/api/events", $scope.event)
        .then(function(data) {
          //console.log(data.status);
          if(data.status == 201){ //CREATED
            $scope.event = {};
            success("Event added");
            console.log("success");
            getEvents();
          }
        }, function(err){
          console.error("update error: ");
          console.error(err);
          failure("Error adding event"); 
          //$location.path("/login");
        });
      }
      else{
        failure("Please complete the form");
      }
    }
    
    $scope.delete = function(key){
      console.log("deleting " + key);
      $http.delete("/api/events/" + key)
        .then(function(data) {
          console.log(data.status);
          // if(data.status == 201){
          //   $scope.match = {}; //clear results
          //   $scope.BGGresults = []; 
          //   $scope.gameDetail = {};
          //   $scope.showGameDetail = false;
          //   success("Match added");
          //   console.log("success");
          getEvents();

          // }
        }, function(err){
          console.error("delete error: ");
          console.error(err);
          failure("Error deleting match"); 
          //$location.path("/login");
        });
    }
  }]).
  controller('eventController', ['$scope', '$routeParams', '$http', '$location', //EVENT.HTML
  function($scope, $routeParams, $http, $location) {
    $scope.itemId = $routeParams.event;
    
    //get current event detail
    $http.get("/api/events/" + $scope.itemId)
    .then(function(response) {
      //console.log(response.data);
      $scope.eventDetail = response.data;
    }, function(error){
      console.log(error.data);
      $location.path("/login");
      //show login
    });
    
    function getMatches(){
      $http.get("/api/events/" + $scope.itemId + "/matches/")
      .then(function(response) {
        //console.log(response.data);
        $scope.matchlist = response.data;
      }, function(error){
        console.log(error.data);
        $location.path("/login");
        //show login
      });
    }
    getMatches();
    
    $scope.addMatch = function(){
      $scope.match = {};
      $scope.BGGresults = []; //clear results
      $scope.gameDetail = {};
      $scope.showGameDetail = false;
      $scope.showAddMatch = true;
    };
    
    $scope.go = function(key){
      console.log("/events/" + $routeParams.event + "/matches/" + key);
      $location.path("/events/" + $routeParams.event + "/matches/" + key);
    };
    
    //live check of game names from BoardGameGeek - TODO: retrieve full game details after selection
    $scope.checkGame = function(){
      if($scope.match.game){
        $scope.checkingGame = true;
        $http.get("/api/bgg/game/search/" + encodeURIComponent($scope.match.game))
          .then(function(data) {
            console.log(data.status);
            if(data.status == 200){
              $scope.checkingGame = false;
              if(data.data.total==1){ //If only 1 result, data is not in array, so put it in one
                $scope.BGGresults = new Array();
                $scope.BGGresults.push(data.data.item);
                $scope.notFound = false;
              }
              else if(data.data.total>1){
                  $scope.BGGresults = data.data.item;
                  $scope.notFound = false;
              }
              else{
                console.log(data.status);
                $scope.notFound = true;
              }
            }
          }, function(err){
            //console.log("usercheck error");
            console.log(err.status);
            $scope.checkingUser = false;
            $scope.notFound = true;
          });
      }
    }
    
    $scope.select = function(id,name,type){
      console.log("selected: " + id);
      $scope.gettingGameDetail = true;
      $scope.BGGresults = []; //clear results
      $scope.gameDetail = {};
      $scope.match.game = name; //update game name
      $scope.match.id = id; //store BGG id for retrieval
      $scope.match.type = type;
      
        //retrieve full game info
        $http.get("/api/bgg/game/" + $scope.match.type + "/" + $scope.match.id)
          .then(function(data) {
            console.log(data.status);
            if(data.status == 200){
              $scope.gettingGameDetail = false;
              $scope.showGameDetail = true;
              //console.log(data.data);
              console.log("# of names: " + data.data.name.length);
              if(data.data.name.length){
                for(var i=0;i<data.data.name.length;i++){
                  if(data.data.name[i].type == "primary"){
                    data.data.name = data.data.name[i];
                    break;
                  }
                }
              }
              $scope.gameDetail = data.data; //data.data.item;
              $scope.match.description = data.data.description;
              $scope.match.numPlayers = data.data.minplayers.value + "-" + data.data.maxplayers.value;
              $scope.match.yearpublished = data.data.yearpublished.value;
              $scope.match.thumbnail = data.data.thumbnail;
            }
          }, function(err){
            //console.log("usercheck error");
            console.log(err.status);
            $scope.gettingGameDetail = false;
            $scope.showGameDetail = false;
            //$scope.checkingUser = false;
            //$scope.notFound = true;
          });
      
    }
    
    $scope.submitForm = function(){
      if($scope.match.game && $scope.match.description){
        $scope.match.eventKey = $scope.eventDetail.eventKey;
        $scope.match.catagories = [];
        // $scope.match.yearpublished = 
        if($scope.gameDetail.link.length){
          for(var i=0;i<$scope.gameDetail.link.length;i++){ //ONLY STORE THE CATAGORIES IN THE DATABASE FOR LISTING
            if($scope.gameDetail.link[i].type == "boardgamecategory"){
              $scope.match.catagories.push($scope.gameDetail.link[i]);
            }
          }
        }
        // $scope.match.catagories = $scope.gameDetail.link;
        $http.post("/api/events/"+$routeParams.event +"/matches", $scope.match)
        .then(function(data) {
          //console.log(data.status);
          if(data.status == 201){
            $scope.match = {}; //clear results
            $scope.BGGresults = []; 
            $scope.gameDetail = {};
            $scope.showGameDetail = false;
            success("Match added");
            console.log("success");
            getMatches();

          }
        }, function(err){
          console.error("update error: ");
          console.error(err);
          failure("Error adding match"); 
          //$location.path("/login");
        });
      }
      else{
        failure("Please complete the form");
      }
    }
    
    $scope.delete = function(key){
      console.log("deleting " + key);
      $http.delete("/api/events/"+ $routeParams.event +"/matches/" + key)
        .then(function(data) {
          console.log(data.status);
          if(data.status == 200){
            success("Match deleted");
          }
          //   $scope.match = {}; //clear results
          //   $scope.BGGresults = []; 
          //   $scope.gameDetail = {};
          //   $scope.showGameDetail = false;
          //   
          //   console.log("success");
          getMatches();

          // }
        }, function(err){
          console.error("delete error: ");
          console.error(err);
          failure("Error deleting match"); 
          //$location.path("/login");
        });
    };
    
    // $scope.joinMatch = function(key){ //TODO: NEED TO THINK ABOUT HOW JOINING A MATCH WILL WORK FROM THE EVENT PAGE
    //   $http.get("/api/events/" + $scope.itemId + "/matches/" + key + "/join")
    //     .then(function(response) {
    //       console.log(response.status);
    //       //$scope.match = response.data;
    //       success("Joined match");
    //       //getPlayers();
    //     }, function(error){
    //       console.log(error.data);
    //       failure("Error joining match");
    //       //$location.path("/login");
    //       //show login
    //     });
    // };
    
  }]).
  controller('matchController', ['$scope', '$routeParams', '$http', '$location', //MATCH.HTML
  function($scope, $routeParams, $http, $location) {
    $scope.eventKey = $routeParams.event;
    $scope.matchKey = $routeParams.match;
    $scope.playerList = {};
    
    
    function getDetail(){
     $http.get("/api/bgg/game/boardgame/" + $scope.match.id)
      .then(function(data) {
        console.log(data.status);
        if(data.status == 200){
          //$scope.gettingGameDetail = false;
          //$scope.showGameDetail = true;
          //console.log(data.data);
          //console.log("# of names: " + data.data.name.length);
          if(data.data.name.length){
            for(var i=0;i<data.data.name.length;i++){
              if(data.data.name[i].type == "primary"){
                data.data.name = data.data.name[i];
                break;
              }
            }
          }
          $scope.gameDetail = data.data; //data.data.item;
        }
      }, function(err){
        //console.log("usercheck error");
        console.log(err.status);
        //$scope.gettingGameDetail = false;
      });
    }
    
    function getPlayers(){
      $http.get("/api/events/" + $scope.eventKey + "/matches/" + $scope.matchKey + "/players")
      .then(function(response) {
        //console.log("players");
        //console.log(response.data);
        $scope.playerList = response.data;
      }, function(error){
        console.log(error.data);
        $location.path("/login");
        //show login
      });
    }
    
    //get current match detail
    $http.get("/api/events/" + $scope.eventKey + "/matches/" + $scope.matchKey)
    .then(function(response) {
      //console.log(response.data);
      $scope.match = response.data;
      //getDetail(); //TODO: REVIEW - MAY BE UNNECESSARILY SENDING REQUESTS FOR DATA THAT IS ALREADY STORED
    }, function(error){
      console.log(error.data);
      $location.path("/login");
      //show login
    });
    
    getPlayers();
    
    $scope.joinMatch = function(){
      $http.get("/api/events/" + $scope.eventKey + "/matches/" + $scope.matchKey + "/join")
        .then(function(response) {
          console.log(response.status);
          //$scope.match = response.data;
          success("Joined match");
          getPlayers();
        }, function(error){
          console.log(error.data);
          failure("Error joining match");
          //$location.path("/login");
          //show login
        });
    };

  }]);
