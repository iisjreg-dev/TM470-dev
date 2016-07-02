var express = require('express');
var routerAPI = express.Router();
var console = require('better-console');
var Q = require('kew');
var db = require('orchestrate')("725c04b3-ad74-44c6-9c9e-9316e68788cd");
var moment = require('moment');

db.ping()
.then(function () {
  // you key is VALID
  console.info("DB ok");
})
.fail(function (err) {
  // your key is INVALID
  console.error(err);
});


/* GET home page. */
routerAPI.get('/', function(req, res, next) {
  res.sendStatus(200);
});

/* BGG test. */
routerAPI.get('/bgg/user/:username', function(req, res, next) {

  var options = {
    timeout: 5000, // timeout of 10s (5s is the default)
    // see https://github.com/cujojs/rest/blob/master/docs/interceptors.md#module-rest/interceptor/retry
    retry: {
        initial: 100,
        multiplier: 2,
        max: 15e3
    }
  };
  var bgg = require('bgg')(options);
  bgg('users', {name: req.params.username})
  .then(function(results){
    res.send("Name: " + results.user.firstname.value + " " + results.user.lastname.value);
    //res.sendStatus(200);
    console.log(results);

  });
});

routerAPI.get('/bgg/game/search/:game', function(req, res, next) { //search for game
  console.log("check game");
  var options = {
    timeout: 5000, // timeout of 10s (5s is the default)
    // see https://github.com/cujojs/rest/blob/master/docs/interceptors.md#module-rest/interceptor/retry
    retry: {
        initial: 200,
        multiplier: 2,
        max: 15e3
    }, 
    toJSONConfig: {
        object: true,
        reversible: false,
        coerce: true,
        sanitize: false,
        trim: true
    }
  };
  
  var bgg = require('bgg')(options);
  var game = decodeURIComponent(req.params.game);
  console.log(game);
  bgg('search', {query: game, type: 'boardgame'})
  .then(function(results){
    res.send(results.items);
    //res.sendStatus(200);
    //console.log(results.items.item);

  }, function(error){
    console.log(error);
    res.sendStatus(500);
    return;
  });
});

routerAPI.get('/bgg/game/:type/:gameId', function(req, res, next) { //GET GAME DETAIL
  var options = {
    timeout: 5000, // timeout of 10s (5s is the default)
    // see https://github.com/cujojs/rest/blob/master/docs/interceptors.md#module-rest/interceptor/retry
    retry: {
        initial: 100,
        multiplier: 2,
        max: 15e3
    }, 
    toJSONConfig: {
        object: true,
        reversible: false,
        coerce: true,
        sanitize: false,
        trim: true
    }
  };
  
  var bgg = require('bgg')(options);
  var gameId = req.params.gameId;
  var type = req.params.type;
  console.log("get " + type + " " + gameId);
  //bgg('thing', {id: gameId, type: type}) //NEED TO BETTER HANDLE TYPES
  bgg('thing', {id: gameId, stats: 1})
  .then(function(results){
    if(results.items.item){
      //console.log(results.items.item);
      res.send(results.items.item);
    }
    else{
      console.log(results);
      res.sendStatus(404);
    }
  });
});



//EVENT MANAGEMENT


routerAPI.get('/events/', //get all events
  //require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    if(!req.user){
      console.error("not logged in");
      res.status(403).send("not logged in");
    }
    else{
      //console.log("user: ");
      //console.log(req.user.username);
      
      //First check for new repeating events
      //console.log("check repeating");
      db.list('Repeating', {limit: 100}) //GET ALL REPEATING RECORDS
      .then(function (repeatResult) {
        //console.log(repeatResult.body);
        var repeatPromises = [];
        //console.log("count = " + repeatResult.body.count);
        //console.log(repeatResult.body.results[0].value.password);
        if(repeatResult.body.count > 0){ 
          //console.log("repeating:" + repeatResult.body.count);
          for(var x in repeatResult.body.results){ //GO THROUGH ALL RECORDS
            //console.info("repeating: " + x + " - " + repeatResult.body.results[x].value.name + "; " + repeatResult.body.results[x].path.key);
            //console.info(repeatResult.body.results[x].value.repeat);
            repeatPromises.push(db.newGraphReader() //GET ALL LINKED EVENTS
              .get()
              .from('Repeating', repeatResult.body.results[x].path.key)
              .related('events')
              .then(function (eventResult) {
                //console.log("result3: ");
                //console.log(result3.body.results);
                var newEvent = {};
                var newEventKey = "";
                var newDate = "";
                var repeat = repeatResult.body.results[x].value.repeat;
                var period = "";
                if(repeat == "daily"){ period = "d";}
                else if(repeat == "weekly"){ period = "w";}
                else if(repeat == "monthly"){ period = "M";}
                
                if (typeof eventResult.body.results !== 'undefined' && eventResult.body.results.length > 0) {
                  var eventExists = false;
                  //console.log("checking events...");
                  for(var i in eventResult.body.results){ //GO THROUGH ALL EVENTS
                    //console.log("event " + eventResult.body.results[i].value.name + " - " + eventResult.body.results[i].value.date);
                    
                    var theDate = moment(eventResult.body.results[i].value.date);
                    var now = moment();
                    if(now.isBefore(theDate.subtract(1, "d"))){ //CHECK TO SEE IF AN EVENT EXISTS IN THE FUTURE (NOT INCLUDING TODAY)
                      //console.log("future event found");
                      eventExists = true;
                    }
                  }
                  
                }
                //console.log("eventExists: " + eventExists);
                if(!eventExists){ //NO FUTURE EVENT SO CREATE ONE
                  newEvent = eventResult.body.results[i].value; //COPY EVENT DATA FROM TEMPLATE
                  newDate = moment(repeatResult.body.results[x].value.date).add(1, period).toDate();
                  newEvent.date = newDate;
                  console.log("new repeating event to be added for: " + repeatResult.body.results[x].value.name + " - " + newDate);
                  return newEvent;
                }
                else{
                  throw "no events needs to be added";
                }

                //return !eventExists;
                
              })
              .then(function(event){
                if(event){
                  return db.post('Events', event) //ADD NEW EVENT
                  .then(function (newEventResult) {
                    //console.log("add success");
                    event.key = newEventResult.path.key;
                    return event;
                  })
                  .fail(function(error){
                    throw "post fail: " + error.body.message;
                  });
                }
                else{
                  return false;
                }
              })
              .then(function(event){
                if(event){
                  return db.newGraphBuilder() //CREATE LINK FROM TEMPLATE TO EVENT
                  .create()
                  .from('Repeating', repeatResult.body.results[x].path.key)
                  .related('events')
                  .to('Events', event.key)
                  .then(function (newEventLinkResult) {
                    //console.log("events link created");
                    return event;
                  })
                  .fail(function(error){
                    throw "link fail: " + error.body.message;
                  });
                }
                else{
                  return false;
                }
              })
              .then(function(event){
                if(event){
                  return db.newPatchBuilder('Repeating', repeatResult.body.results[x].path.key) // UPDATE TEMPLATE
                  .replace('date', event.date)
                  .apply()
                  .then(function (result) {
                      // All changes were applied successfully
                      //console.log("template updated");
                      return true; //FINAL PROMISE RETURN
                  })
                  .fail(function(error){
                    throw "patch fail: " + error.body.message;
                  });
                }
                else{
                  throw "promise fail";  //SOMETHING WENT WRONG?
                }
              })
              .fail(function(err){
                console.error(err);
                return false; //FINAL PROMISE RETURN (FAIL)
              })
            );
              
          }
        }
        else{
          console.log("no repeating");
          repeatPromises.push(true);
        }

        Q.all(repeatPromises) //ONLY GET EVENTS AFTER THE REPEATING HAS BEEN CHECKED
        .then(function (content) {
          //console.log("repeatPromises: ");
          //console.log(content);
          console.log("list all events");
          db.list('Events', {limit:100}) //will eventually change to accomodate multiple organisations
          .then(function (result2) {
            //console.log(result.body);
            
            //console.log("count = " + result2.body.count);
            //console.log(result.body.results[0].value.password);
            if(result2.body.count == 0){ 
              console.log("no events found");
              res.status(200).send("no events found"); 
            }
            //console.log("done");
            //console.info("RES.SEND");
            res.send(result2.body); 
          })
          .fail(function (err) {
            console.log("error : " + err.body.message);
            console.log("count=" + err.body.count);
            res.send(err); 
          });
        });



      })
      .fail(function (err) {
        console.log("error : " + err.body.message);
        console.log("count=" + err.body.count);
      });
      
      
      
    }
  });
  
  
routerAPI.get('/events/:event', //get 1 event
  require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    console.log("user: ");
    console.log(req.user.username);
    console.log("get event " + req.params.event);
    db.get('Events', req.params.event)
    .then(function (result) {
      //console.log(result.body);
      
      //console.log("count = " + result.body.count);
      //console.log(result.body.results[0].value.password);
      if(result.body.count == 0){ 
        console.log("no events found");
        res.status(404).send("no events found"); 
      }
      console.log("done");
      result.body.eventKey = req.params.event;
      res.send(result.body); 
    })
    .fail(function (err) {
      console.log("error : count=" + err.body.count);
      res.send(err); 
    });
  });
  
routerAPI.delete('/events/:event', //delete event
  require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    console.log("user: ");
    console.log(req.user.username);
    console.log("delete event " + req.params.event);
    
    
    //delete all matches for event
    var matches = [];
    
    // db.newGraphBuilder()
    //       .remove()
    //       .from('users', 'Steve')
    //       .related('likes')
    //       .to('movies', 'Superbad')
    
    db.newGraphReader()
      .get()
      .from('Events', req.params.event)
      .related('contains')
      .then(function (result) {
        console.log("Matches for event: " + req.params.event);
        //console.log(result.body.results);
        //res.send(result.body.results);
        matches = result.body.results;

        console.log("# matches: " + matches.length);
        
        for(var i=0;i<matches.length;i++){
          var iMatch = matches[i].path.key;
          console.log(i + " - " + iMatch);
          db.remove('Matches', iMatch, true)
            .then(function (result) {
              //console.log(result.body);
              //console.log("match " + matches[i].path.key + " deleted");
              console.log("deleted");
            })
            .fail(function (err) {
              console.log("Match remove error : " + err);
              res.send(err); 
            });
        }  
        
        //delete event 
        db.remove('Events', req.params.event, true)
        .then(function (result) {
          console.log("event " + req.params.event + " deleted");
          res.sendStatus(200); 
        })
        .fail(function (err) {
          console.log("Event remove error : " + err);
          res.send(err); 
        });
        
      });
      
    
  });
  
routerAPI.post('/events/', //post event
  require('connect-ensure-login').ensureLoggedIn('/auth/login'),
  function(req, res){
    console.log("user: ");
    console.log(req.user.username);
    console.log("add event " + req.body.name);
    db.post('Events', req.body)
    .then(function (result) {
      if(result.statusCode == "201"){
        
        var promises = [];
        
        console.log("status: 201");
        console.log("create link to user");
        
        promises.push(db.newGraphBuilder()
          .create()
          .from('Users', req.user.username)
          .related('created')
          .to('Events', result.path.key)
          .then(function (result2) {
            console.log("link created");
            return true;
          })
        );
        if(req.body.showRepeating){
          console.log("create repeating event");
          promises.push(db.post('Repeating', req.body)
            .then(function (result2) {
              console.log("repeat added");
              console.log("create link to event");
              //return true;
              
              db.newGraphBuilder()
                .create()
                .from('Repeating', result2.path.key)
                .related('events')
                .to('Events', result.path.key)
                .then(function (result3) {
                  console.log("events link created");
                  return true;
                });
              
            })
            .fail(function (err) {
              console.log("error " + err);
            })
          );
        }
        
        Q.all(promises) //all promises are now complete (returned true), so send response
          .then(function (content) {
            res.status(201).send(result.path.key);
          })
          .fail(function (err) {
            console.log("promise error send: " + err);
          });
        
        
        console.log("done");
         
        //res.redirect("/events/" + result.path.key); //should change response for API usage
      }
      else{
        res.status(result.statusCode).send("error");
      }
    })
    .fail(function (err) {
      console.log("error");
      res.send(err); 
    });
  });
  
////REPEATING EVENT MANAGEMENT

routerAPI.get('/repeating', //get all repeating events
  //require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    if(!req.user){
      console.error("not logged in");
      res.status(403).send("not logged in");
    }
    else{
      console.log("list all repeating events");
      db.list('Repeating') //will eventually change to accomodate multiple organisations
      .then(function (result2) {
        //console.log(result.body);
        
        console.log("count = " + result2.body.count);
        //console.log(result.body.results[0].value.password);
        if(result2.body.count == 0){ 
          console.log("no events found");
          res.status(200).send("no events found"); 
        }
        //console.log("done");
        res.send(result2.body); 
      })
      .fail(function (err) {
        console.log("error : count=" + err.body.count);
        res.send(err); 
      });
    }
  });
  

routerAPI.delete('/repeating/:event', //delete repeating event
  require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    console.log("user: ");
    console.log(req.user.username);
    console.log("delete event " + req.params.event);
    
    //delete repeating event 
    db.remove('Repeating', req.params.event, true)
    .then(function (result) {
      console.log("repeating event " + req.params.event + " deleted");
      res.sendStatus(200); 
    })
    .fail(function (err) {
      console.error("Repeating Event remove error : " + err);
      res.send(err); 
    });
        
  });
  
  
////MATCH MANAGEMENT

routerAPI.get('/events/:event/matches/', //get all matches
  require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    if(!req.user){
      console.error("not logged in");
      res.status(403).send("not logged in");
    }
    else{
      console.log("user: ");
      console.log(req.user.username);
      console.log("list all matches");
      
      //NEED TO GRAPH SEARCH
      //res.sendStatus(503);
      db.newGraphReader()
        .get()
        .from('Events', req.params.event)
        .related('contains')
        .then(function (result) {
          console.log("Matches for event: " + req.params.event);
          //console.log(result.body.results);
          //res.send(result.body.results);
          return result.body.results;
        })
        .then(function (matchlist) {
          var promises = [];
          
          for(var i in matchlist){
            //console.log("match", matchlist[i].path.key);
            promises.push(db.newGraphReader()
              .get()
              .from('Matches', matchlist[i].path.key)
              .related('players')
              //.withoutFields(['value.password', 'value.salt'])
              .then(function (players) {
                var playerNames = [];
                //console.log(players.body.results);
                players.body.results.forEach(function(player) {
                  playerNames.push(player.value.name);
                });
                return playerNames.join(", ");
              })
            );
          }
          
          Q.all(promises)
          .then(function (content) {
            for(var i in matchlist){
              matchlist[i].value.players = content[i];
            }
            res.send(matchlist); //only send after all promises are fulfilled
          });
          return true;
        });
      
    }
  });
  
  
routerAPI.get('/events/:event/matches/:match', //get 1 match
  require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    console.log("user: ");
    console.log(req.user.username);
    console.log("get match " + req.params.match);
    db.get('Matches', req.params.match)
    .then(function (result) {
      //console.log(result.body);
      
      //console.log("count = " + result.body.count);
      //console.log(result.body.results[0].value.password);
      if(result.body.count == 0){ 
        console.log("no matches found");
        res.status(404).send("no matches found"); 
      }
      console.log("done");
      res.send(result.body); 
    })
    .fail(function (err) {
      console.log("error : count=" + err.body.count);
      res.send(err); 
    });
  });
  
routerAPI.post('/events/:event/matches/:match/players', //join match
  require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    console.log("user: ");
    console.log(req.user.username);
    console.log("join match " + req.params.match);
    
    db.newGraphBuilder() //CREATE USER > MATCH LINK
      .create()
      .from('Users', req.user.username)
      .related('playing')
      .to('Matches', req.params.match)
      .then(function (result) {
        console.log("link created");
        //res.sendStatus(200);
      });
    db.newGraphBuilder() //CREATE MATCH > USER LINK
      .create()
      .from('Matches', req.params.match)
      .related('players')
      .to('Users', req.user.username)
      .then(function (result) {
        console.log("link created");
        res.sendStatus(200);
      });
  });
  
routerAPI.delete('/events/:event/matches/:match/players', //leave match
  require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    console.log("user: ");
    console.log(req.user.username);
    console.log("leave match " + req.params.match);
    
    db.newGraphBuilder() //REMOVE USER > MATCH LINK
      .remove()
      .from('Users', req.user.username)
      .related('playing')
      .to('Matches', req.params.match)
      .then(function (result) {
        console.log("link removed");
        //res.sendStatus(200);
      });
    db.newGraphBuilder() //REMOVE MATCH > USER LINK
      .remove()
      .from('Matches', req.params.match)
      .related('players')
      .to('Users', req.user.username)
      .then(function (result) {
        console.log("link removed");
        res.sendStatus(200);
      });
    
  });
  
routerAPI.post('/events/:event/matches/:match/bring', //bring game
  require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    console.log("user: ");
    console.log(req.user.username);
    console.log("bring game " + req.params.match);
    
    db.newGraphBuilder() //CREATE USER > MATCH BRING LINK
      .create()
      .from('Users', req.user.username)
      .related('canBring')
      .to('Matches', req.params.match)
      .then(function (result) {
        console.log("link created");
        //res.sendStatus(200);
      });
    db.newGraphBuilder() //CREATE MATCH BRING > USER LINK
      .create()
      .from('Matches', req.params.match)
      .related('canBring')
      .to('Users', req.user.username)
      .then(function (result) {
        console.log("link created");
        res.sendStatus(200);
      });
  });
  
routerAPI.delete('/events/:event/matches/:match/bring', //not bring a game
  require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    console.log("user: ");
    console.log(req.user.username);
    console.log("not bring game " + req.params.match);
    
    db.newGraphBuilder() //REMOVE USER > MATCH BRING LINK
      .remove()
      .from('Users', req.user.username)
      .related('canBring')
      .to('Matches', req.params.match)
      .then(function (result) {
        console.log("link removed");
        //res.sendStatus(200);
      });
    db.newGraphBuilder() //REMOVE MATCH BRING > USER LINK
      .remove()
      .from('Matches', req.params.match)
      .related('canBring')
      .to('Users', req.user.username)
      .then(function (result) {
        console.log("link removed");
        res.sendStatus(200);
      });
    
  });
  
routerAPI.post('/events/:event/matches/:match/teach', //teach game
  require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    console.log("user: ");
    console.log(req.user.username);
    console.log("teach game " + req.params.match);
    
    db.newGraphBuilder() //CREATE USER > MATCH BRING LINK
      .create()
      .from('Users', req.user.username)
      .related('canTeach')
      .to('Matches', req.params.match)
      .then(function (result) {
        console.log("link created");
        //res.sendStatus(200);
      });
    db.newGraphBuilder() //CREATE MATCH BRING > USER LINK
      .create()
      .from('Matches', req.params.match)
      .related('canTeach')
      .to('Users', req.user.username)
      .then(function (result) {
        console.log("link created");
        res.sendStatus(200);
      });
  });
  
routerAPI.delete('/events/:event/matches/:match/teach', //not teach a game
  require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    console.log("user: ");
    console.log(req.user.username);
    console.log("not teach game " + req.params.match);
    
    db.newGraphBuilder() //REMOVE USER > MATCH BRING LINK
      .remove()
      .from('Users', req.user.username)
      .related('canTeach')
      .to('Matches', req.params.match)
      .then(function (result) {
        console.log("link removed");
        //res.sendStatus(200);
      });
    db.newGraphBuilder() //REMOVE MATCH BRING > USER LINK
      .remove()
      .from('Matches', req.params.match)
      .related('canTeach')
      .to('Users', req.user.username)
      .then(function (result) {
        console.log("link removed");
        res.sendStatus(200);
      });
    
  });
  
routerAPI.delete('/events/:event/matches/:match', //delete match
  require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    console.log("user: ");
    console.log(req.user.username);
    console.log("delete match " + req.params.match);
    db.remove('Matches', req.params.match, true)
    .then(function (result) {
      res.sendStatus(200); 
    })
    .fail(function (err) {
      console.log("error : " + err.body);
      res.send(err.body); 
    });
  });
  
routerAPI.post('/events/:event/matches/', //post match
  require('connect-ensure-login').ensureLoggedIn('/auth/login'),
  function(req, res){
    console.log("user: ");
    console.log(req.user.username);
    console.log("add match " + req.body.game);
    console.log(req.body);
    db.post('Matches', req.body)
    .then(function (result) {
      if(result.statusCode == "201"){
        console.log("status: 201");
        console.log("create links");
        console.log("user key: " + req.user.username);
        console.log("event key: " + req.params.event);
        console.log("match key: " + result.path.key);
        db.newGraphBuilder()
        .create()
        .from('Users', req.user.username)
        .related('created')
        .to('Matches', result.path.key)
        .then(function (res) {
          console.log("user link created");
        })
        .fail(function (res) {
          console.log("user link error");
        });
        db.newGraphBuilder()
        .create()
        .from('Events', req.params.event)
        .related('contains')
        .to('Matches', result.path.key)
        .then(function (res) {
          console.log("event link created");
        })
        .fail(function (res) {
          console.log("event link error");
        });
        console.log("done");
        res.status(201).send(result.path.key); 
        //res.redirect("/events/" + result.path.key); //should change response for API usage
      }
      else{
        res.status(result.statusCode).send("error");
      }
    })
    .fail(function (err) {
      console.log("error");
      console.log(err);
      res.status(500).send(err); 
    });
  });
  
routerAPI.get('/events/:event/matches/:match/players', //get players
  require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    if(!req.user){
      console.error("not logged in");
      res.status(403).send("not logged in");
    }
    else{
      //console.log("user: ");
      //console.log(req.user.username);
      console.log("list all players");
      
      //NEED TO GRAPH SEARCH
      //res.sendStatus(503);
      var players = db.newGraphReader()
        .get()
        .from('Matches', req.params.match)
        .related('players')
        //.withoutFields(['value.password', 'value.salt']) //WHY IS THIS COMMENTED OUT?
        .then(function (result) {
          //console.log(result.body.results);
          return result.body.results;
        })
        .then(function(playerList){
          var promises = []; 
          //var promises2 = []; 
          
          promises.push(db.newGraphReader() //get players for each match that canBring game
            .get()
            .from('Matches', req.params.match)
            .related('canBring')
            .then(function (players) {
              var playerNames = [];
              players.body.results.forEach(function(player) {
                playerNames.push(player.value.username);
              });
              //return playerNames.join(", ");
              
              for(var i in playerList){ //check each player to see if they can bring game
                if(playerNames.indexOf(playerList[i].value.username) >= 0){
                  playerList[i].value.canBring = true;
                }
              }
              
              return true;
            })
            .fail(function (err) {
              console.log("player error 1: " + err);
            })
          );
          
          promises.push(db.newGraphReader() //get players for each match that canTeach game
            .get()
            .from('Matches', req.params.match)
            .related('canTeach')
            .then(function (players) {
              var playerNames = [];
              players.body.results.forEach(function(player) {
                playerNames.push(player.value.username);
              });
              //return playerNames.join(", ");
              
              for(var i in playerList){ //check each player to see if they can bring game
                if(playerNames.indexOf(playerList[i].value.username) >= 0){
                  playerList[i].value.canTeach = true;
                }
              }
              
              return true;
            })
            .fail(function (err) {
              console.log("player error 2: " + err);
            })
          );
            
          Q.all(promises) //all promises are now complete (returned true), so send response
          .then(function (content) {
            // console.log("playerList");
            // console.log(playerList);
            // console.log("content");
            // console.log(content);
            res.send(playerList);
          })
          .fail(function (err) {
            console.log("player error send: " + err);
          });
            
            
          //res.send(playerList);
        });
    }
  });
  
routerAPI.get('/mymatches', //get my matches
  require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    if(!req.user){
      console.error("not logged in");
      res.status(403).send("not logged in");
    }
    else{
      console.log("user: ");
      console.log(req.user.username);   
      console.log("list my matches");
      
      var matches = db.newGraphReader()
        .get()
        .from('Users', req.user.username)
        .related('playing')
        .then(function (result) {
          console.log(result.body.count);
          return result.body.results;
        })
        .then(function (matchlist){
          var promises = []; //promises for event info
          var promises2 = []; //promises for player info
          var promisesCombined = [];
          
          for(var i in matchlist){
            //console.log(matchlist[i].value.eventKey);
            
            promises.push(db.get('Events', matchlist[i].value.eventKey) //get the event for each match
              .then(function (event) {
                return event; //return it to the promise
              })
              .fail(function (err) {
                console.log("event error : " + err);
              })
            );
            
            promises2.push(db.newGraphReader() //get players for each match
              .get()
              .from('Matches', matchlist[i].path.key)
              .related('players')
              //.withoutFields(['value.password', 'value.salt'])
              .then(function (players) {
                var playerNames = [];
                players.body.results.forEach(function(player) {
                  playerNames.push(player.value.name);
                });
                return playerNames.join(", ");
              })
              .fail(function (err) {
                console.log("player error : " + err);
              })
            );
            
          }
          
          promisesCombined.push(Q.all(promises) //create a promise for the completion of the event Promises
            .then(function (content) {
              for(var i in matchlist){
                matchlist[i].value.date = content[i].body.date;
                matchlist[i].value.eventName = content[i].body.name;
              }
              return true;
            })
          );
          
          promisesCombined.push(Q.all(promises2) //create a promise for the completion of the player Promises
            .then(function (content) {
              for(var i in matchlist){
                matchlist[i].value.players = content[i];
              }
              return true;
            })
          );
          
          Q.all(promisesCombined) //all promises are now complete (returned true), so send response
          .then(function (content) {
            res.send(matchlist);
          })
          .fail(function (err) {
            console.log("player error : " + err);
          });
          
          return true;
        })
        .fail(function (err) {
          res.status(500).send(err);
        });
    }
  });

module.exports = routerAPI;
