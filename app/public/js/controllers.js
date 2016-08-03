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

    //reference to notie.js javascript functions for use in template pages -- TODO: SHould use Angular DI in a Service.
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
  controller('mainController', function ($scope) { //MAIN.HTML - mainly used for testing -- will eventual be a 'dashboard' or list of upcoming events/notifications

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
            $location.path("/login");
            //window.location.reload();
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
          return;
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
        if(response.status == 204){
          $scope.eventlist = null;
          $scope.eventlist2 = null;
          $scope.noGroups = true;
          return;
        }
        var pastEvents = [];
        var futureEvents = [];
        if (typeof response.data.results !== 'undefined' && response.data.results.length > 0) {
          response.data.results.forEach(function(event){
            //console.log("event date", event.value.date);
            var theDate = new Date(event.value.date);
            var theTime = new Date(event.value.time);
            var aMoment = moment(theDate.toDateString() + " " + theTime.toTimeString()); //TODO: SORT OUT PROPER TIMESTAMP
            if(aMoment.isBefore()){
              pastEvents.push(event);
            }
            else{
              futureEvents.push(event);
            }
          });
          if(futureEvents.length > 0){$scope.eventlist = futureEvents;}
          if(pastEvents.length > 0){$scope.eventlist2 = pastEvents;}
        }
        else{
          $scope.eventlist = null;
          $scope.eventlist2 = null;
          $scope.noEvents= true;
        }
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
    };
    
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
    };
    
    $scope.delete = function(key){
      console.log("deleting " + key);
      $http.delete("/api/events/" + key)
        .then(function(data) {
          console.log(data.status);
           if(data.status == 200){
            success("Event deleted");
            getEvents();
           }
        }, function(err){
          console.error("delete error: ");
          console.error(err);
          failure("Error deleting match"); 
          //$location.path("/login");
        });
    };
  }]).
  controller('groupsController', ['$scope', '$http', '$location', //GROUPS.HTML
  function ($scope, $http, $location) {
    $scope.group = {};
    $scope.showAddGroup = false;
    
    //Load group list
    function getGroups(){
      $http.get("/api/groups")
      .then(function(response) {
        console.log(response.status);
        if (typeof response.data.results !== 'undefined' && response.data.results.length > 0) {
          $scope.grouplist = response.data.results;
        }
        else{
          $scope.grouplist = null;
          $scope.noGroups= true;
        }
      }, function(error){
        console.log(error.data);
        $location.path("/login");
        //show login
      });
    }
    getGroups();
    
    $scope.addGroup = function(){
      $scope.group = {}; //clear addGroup form
      $scope.showAddGroup = true;
    };
    
    $scope.joinGroup = function(key){
      $http.post("/api/groups/" + key + "/members", $scope.user)
        .then(function(response) {
          console.log(response.status);
          //$scope.match = response.data;
          success("Joined group");
          //$scope.group.inGroup = true;
          //getPlayers();
        }, function(error){
          console.log(error.data);
          failure("Error joining group");
          //$location.path("/login");
          //show login
        });
    };
    
    $scope.leaveGroup = function(key){
      $http.delete("/api/groups/" + key + "/members", $scope.user)
        .then(function(response) {
          console.log(response.status);
          //$scope.match = response.data;
          success("Left group");
          //$scope.match.inMatch = false;
          //getPlayers();
        }, function(error){
          console.log(error.data);
          failure("Error leaving group");
          //$location.path("/login");
          //show login
        });
    };
    
    $scope.submitForm = function(){
      if($scope.group.name && $scope.group.description){ //NOT all fields mandatory
        $http.post("/api/groups", $scope.group)
        .then(function(data) {
          //console.log(data.status);
          if(data.status == 201){ //CREATED
            $scope.group = {};
            success("Group created");
            console.log("success");
            getGroups();
          }
        }, function(err){
          console.error("update error: ");
          console.error(err);
          failure("Error adding group"); 
        });
      }
      else{
        failure("Please complete the mandatory fields");
      }
    };
    
  }]).
  controller('repeatingController', ['$scope', '$http', '$location', //REPEATING.HTML
  function ($scope, $http, $location) {
    $scope.event = {};
    $scope.showAddEvent = false;
    
    //Load event list
    function getEvents(){
      $http.get("/api/repeating")
      .then(function(response) {
        console.log(response.status);
        $scope.eventlist3 = response.data.results;
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
    
    $scope.goRepeat = function(key){
      console.log("/repeating/" + key);
      $location.path("/repeating/" + key);
    };
    
    $scope.submitForm = function(){
      if($scope.event.name && $scope.event.description && $scope.event.date && $scope.event.time){ //all fields completed
        $http.post("/api/repeating", $scope.event)
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
    };
    
    $scope.deleteRepeat = function(key){
      console.log("deleting " + key);
      $http.delete("/api/repeating/" + key)
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
          failure("Error deleting repeating event"); 
          //$location.path("/login");
        });
    };
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
                $scope.checkingGame = false;
              }
            }
          }, function(err){
            //console.log("usercheck error");
            console.log(err.status);
            $scope.checkingGame = false;
            $scope.notFound = true;
          });
      }
    };
    
    $scope.select = function(id,name,type){
      console.log("selected: " + id);
      $scope.gettingGameDetail = true;
      $scope.BGGresults = []; //clear results
      $scope.gameDetail = {};
      $scope.match.game = name; //update game name
      $scope.match.id = id; //store BGG id for retrieval
      $scope.match.type = type;
      $scope.expand = false;
      
        //retrieve full game info
        $http.get("/api/bgg/game/" + $scope.match.type + "/" + $scope.match.id)
          .then(function(data) {
            console.log(data.status);
            if(data.status == 200){
              $scope.gettingGameDetail = false;
              $scope.showGameDetail = true;
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
              
              var description = data.data.description.trim();
              description = description.replace(/&#10;/g, '<br />');
              $scope.match.description = description;
              $scope.gameDetail.description = description;
              
              var shortDesc = data.data.description.substr(0,350);
              shortDesc = shortDesc.concat("...");
              $scope.match.description_short = shortDesc.replace(/&#10;/g, '<br />');
              $scope.gameDetail.description_short = shortDesc.replace(/&#10;/g, '<br />');
              
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
      
    };
    
    $scope.submitForm = function(){
      if($scope.match.game && $scope.match.description){
        $scope.match.eventKey = $scope.eventDetail.eventKey;
        $scope.match.catagories = [];
        $scope.match.proposedBy = $scope.user;    
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
    };
    
    
    $scope.deleteEvent = function(){
      console.log("deleting " + $routeParams.event);
      $http.delete("/api/events/" + $routeParams.event)
        .then(function(data) {
          console.log(data.status);
           if(data.status == 200){
            success("Event deleted");
            //getEvents();
            $location.path("/events");
           }
        }, function(err){
          console.error("delete error: ");
          console.error(err);
          failure("Error deleting event"); 
          //$location.path("/login");
        });
    };
    
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
        var players = [];
        // var values = response.data.value;
        // values.forEach(function(){
        //   players.push(this.username);
        // })
        var found = false;
        for(var x in response.data){
          if(!found){
            console.info("resp " + x + ": " + response.data[x].value.username);
            if(response.data[x].value.username == $scope.user.username){
              found = true;
              $scope.inMatch = true;
              if(response.data[x].value.canBring){
                $scope.canBring = true;
              }
              else{
                $scope.canBring = false;
              }
              if(response.data[x].value.canTeach){
                $scope.canTeach = true;
              }
              else{
                $scope.canTeach = false;
              }
            }
            else{
              $scope.inMatch = false;
            }
          }
        }
        // console.info(players);
        // console.info($scope.user.username);
        // console.info(players.indexOf($scope.user.username));

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
      
      var description = response.data.description.trim();
      description = description.replace(/&#10;/g, '<br />');
      $scope.match.description = description;
      //$scope.gameDetail.description = description;
      
      var shortDesc = response.data.description.substr(0,350);
      shortDesc = shortDesc.concat("...");
      $scope.match.description_short = shortDesc.replace(/&#10;/g, '<br />');
      //$scope.gameDetail.description_short = shortDesc.replace(/&#10;/g, '<br />'); 
      
      
      //getDetail(); //TODO: REVIEW - MAY BE UNNECESSARILY SENDING REQUESTS FOR DATA THAT IS ALREADY STORED
    }, function(error){
      console.log(error.data);
      $location.path("/login");
      //show login
    });
    
    getPlayers();
    
    $scope.canBringGame = function(){
      $http.post("/api/events/" + $scope.eventKey + "/matches/" + $scope.matchKey + "/bring", $scope.user)
        .then(function(response) {
          console.log(response.status);
          //$scope.match = response.data;
          success("Updated");
          $scope.match.canBring = true;
          getPlayers();
        }, function(error){
          console.log(error.data);
          failure("Error");
          //$location.path("/login");
          //show login
        });
    };
    
    $scope.cannotBringGame = function(){
      $http.delete("/api/events/" + $scope.eventKey + "/matches/" + $scope.matchKey + "/bring", $scope.user)
        .then(function(response) {
          console.log(response.status);
          //$scope.match = response.data;
          success("Updated");
          $scope.match.canBring = false;
          getPlayers();
        }, function(error){
          console.log(error.data);
          failure("Error");
          //$location.path("/login");
          //show login
        });
    };
    
    $scope.canTeachGame = function(){
      $http.post("/api/events/" + $scope.eventKey + "/matches/" + $scope.matchKey + "/teach", $scope.user)
        .then(function(response) {
          console.log(response.status);
          //$scope.match = response.data;
          success("Updated");
          $scope.match.canTeach = true;
          getPlayers();
        }, function(error){
          console.log(error.data);
          failure("Error");
          //$location.path("/login");
          //show login
        });
    };
    
    $scope.cannotTeachGame = function(){
      $http.delete("/api/events/" + $scope.eventKey + "/matches/" + $scope.matchKey + "/teach", $scope.user)
        .then(function(response) {
          console.log(response.status);
          //$scope.match = response.data;
          success("Updated");
          $scope.match.canTeach = false;
          getPlayers();
        }, function(error){
          console.log(error.data);
          failure("Error");
          //$location.path("/login");
          //show login
        });
    };
    
    $scope.joinMatch = function(){
      $http.post("/api/events/" + $scope.eventKey + "/matches/" + $scope.matchKey + "/players", $scope.user)
        .then(function(response) {
          console.log(response.status);
          //$scope.match = response.data;
          success("Joined match");
          $scope.match.inMatch = true;
          getPlayers();
        }, function(error){
          console.log(error.data);
          failure("Error joining match");
          //$location.path("/login");
          //show login
        });
    };
    
    $scope.leaveMatch = function(){
      $http.delete("/api/events/" + $scope.eventKey + "/matches/" + $scope.matchKey + "/players", $scope.user)
        .then(function(response) {
          console.log(response.status);
          //$scope.match = response.data;
          success("Left match");
          $scope.match.inMatch = false;
          getPlayers();
        }, function(error){
          console.log(error.data);
          failure("Error leaving match");
          //$location.path("/login");
          //show login
        });
    };
    
    $scope.deleteMatch = function(){
      console.log("deleting " + $routeParams.match);
      $http.delete("/api/events/"+ $routeParams.event +"/matches/" + $routeParams.match)
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
          //getMatches();
          $location.path("/events/"+ $routeParams.event);

          // }
        }, function(err){
          console.error("delete error: ");
          console.error(err);
          failure("Error deleting match"); 
          //$location.path("/login");
        });
    };

  }]).
  controller('mymatchController', ['$scope', '$routeParams', '$http', '$location', //MYMATCHES.HTML
  function($scope, $routeParams, $http, $location) {
    $scope.itemId = $routeParams.event;
    
    function getMatches(){
      $http.get("/api/mymatches")
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
    
    $scope.go = function(event, key){
      console.log("/events/" + event + "/matches/" + key);
      $location.path("/events/" + event + "/matches/" + key);
    };
    
    $scope.leave = function(event, key){
      console.log("leave match " + key);
      $http.delete("/api/events/" + event + "/matches/" + key + "/players")
        .then(function(data) {
          console.log(data.status);
          if(data.status == 200){
            success("Left match");
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
          failure("Error leaving match"); 
          //$location.path("/login");
        });
    };
    
  }]);
