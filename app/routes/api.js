var express = require('express');
var routerAPI = express.Router();
var console = require('better-console');
var Q = require('kew');
var db = require('orchestrate')(process.env.API_KEY);
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
    //console.log(results);

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
  //console.log(game);
  bgg('search', {query: game, type: 'boardgame'})
  .then(function(results){
    res.send(results.items);
    //res.sendStatus(200);
    //console.log(results.items.item);

  }, function(error){
    console.error(error);
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
      //console.log(results);
      res.sendStatus(404);
    }
  });
});



//EVENT MANAGEMENT


routerAPI.get('/events/', //get all events
  //require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    if(!req.user){
      //console.error("not logged in");
      res.status(403).send("not logged in");
    }
    else{
      var groupSearch = "";
      db.newGraphReader() //GET GROUPS
        .get()
        .from('Users', req.user.username)
        .related('joined')
        .then(function (groupResult) {
          //console.log(groupResult.body.results);
          if(groupResult.body.count == 0){
            res.status(204).send("No groups joined");
            console.log("no groups");
            throw "no groups";
          }
          for(var a in groupResult.body.results){
            groupSearch += '"' + groupResult.body.results[a].value.name + '"';
            if(a < groupResult.body.count - 1){ groupSearch += " OR "}
          }
          //console.log(groupSearch);
          return groupSearch;
          
        })
        .then(function(groupSearch){
          
        
      
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
            //console.info("repeating: x=" + x + " - " + repeatResult.body.results[x].value.name + "; " + repeatResult.body.results[x].path.key);
            //console.info(repeatResult.body.results[x].value.repeat);
            repeatPromises.push((function (item){
              db.newGraphReader() //GET ALL LINKED EVENTS
              .get()
              .from('Repeating', item.path.key)
              .related('events')
              .then(function (eventResult) {
                //console.log("result3: ");
                //console.log(result3.body.results);
                var newEvent = {};
                var newDate = "";
                var repeat = item.value.repeat;
                var period = "";
                if(repeat == "daily"){ period = "d";}
                else if(repeat == "weekly"){ period = "w";}
                else if(repeat == "monthly"){ period = "M";}
                
                if (typeof eventResult.body.results !== 'undefined' && eventResult.body.results.length > 0) {
                  var eventExists = false;
                  //console.info("checking events...");
                  for(var i in eventResult.body.results){ //GO THROUGH ALL EVENTS
                    //console.info("event i=" + i + ": " + eventResult.body.results[i].value.name + " - " + eventResult.body.results[i].value.date);
                    
                    var theDate = moment(eventResult.body.results[i].value.date);
                    var now = moment();
                    if(now.isBefore(theDate.subtract(1, "d"))){ //CHECK TO SEE IF AN EVENT EXISTS IN THE FUTURE (NOT INCLUDING TODAY)
                      //console.info("event " + eventResult.body.results[i].value.name + " - future event found");
                      eventExists = true;
                    }
                  }
                  
                }
                //console.log("eventExists: " + eventExists);
                if(!eventExists){ //NO FUTURE EVENT SO CREATE ONE
                  newEvent = item.value; //COPY EVENT DATA FROM TEMPLATE
                  newDate = moment(item.value.date).add(1, period).toDate();
                  newEvent.date = newDate;
                  console.info("new repeating event to be added for x=" + x + ": " + item.value.name + " - " + newDate);
                  return newEvent; //pass event on to next then() function
                }
                else{
                  throw "no events needs to be added"; //reject promise
                }

                //return !eventExists;
                
              })
              .then(function(event){
                if(event){
                  return db.post('Events', event) //ADD NEW EVENT
                  .then(function (newEventResult) {
                    //console.log("add success");
                    event.key = newEventResult.path.key;
                    return event; //pass event on to next then() function
                  })
                  .fail(function(error){
                    throw "post fail: " + error.body.message; //reject promise
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
                  .from('Repeating', item.path.key)
                  .related('events')
                  .to('Events', event.key)
                  .then(function (newEventLinkResult) {
                    //console.log("events link created");
                    return event; //pass event on to next then() function
                  })
                  .fail(function(error){
                    throw "link fail: " + error.body.message; //end promise
                  });
                }
                else{
                  return false;
                }
              })
              .then(function(event){
                if(event){
                  return db.newPatchBuilder('Repeating', item.path.key) // UPDATE TEMPLATE
                  .replace('date', event.date)
                  .apply()
                  .then(function (result) {
                      // All changes were applied successfully
                      //console.log("template updated");
                      return true; //FINAL PROMISE RETURN
                  })
                  .fail(function(error){
                    throw "patch fail: " + error.body.message; //reject promise
                  });
                }
                else{
                  throw "promise fail";  //SOMETHING WENT WRONG?
                }
              })
              .fail(function(err){
                console.log(">" + err);
                return false; //FINAL PROMISE RETURN (FAIL)
              });
            })(repeatResult.body.results[x])); //PASS THE RESULT TO THE ANONYMOUS CLOSURE FUNCTION
              
          }
        }
        else{
          console.log("no repeating");
          repeatPromises.push(true);
        }

        Q.all(repeatPromises) //ONLY GET EVENTS AFTER THE REPEATING TEMPLTATES HAVE BEEN CHECKED
        .then(function (content) { 
          //content contains the results of the promisestrue for event created or no templates and false for fail/no creation needed
          //I think this could contain more details rather than true/false
          
          //console.log("repeatPromises: ");
          //console.log(content);
          //console.log("list all events");
          //db.list('Events', {limit:100}) //will eventually change to accomodate multiple organisations - should change to a search!
          //db.search('Events', 'value.group: ' + groupSearch)
          //console.log('value.group: ' + groupSearch);
          db.newSearchBuilder()
          .collection('Events')
          .sort('date', 'asc')
          .limit(100)
          .query('value.group: ' + groupSearch)
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
            console.error("error : " + err.body.message);
            console.error("count=" + err.body.count);
            res.status(500).send(err); 
          });
        });



      })
      .fail(function (err) {
        console.error("error : " + err.body.message);
        console.log("count=" + err.body.count);
      });
      
      });
      
      
    }
  });
  
  
routerAPI.get('/events/:event', //get 1 event
  //require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    //console.log("user: ");
    //console.log(req.user.username);
    //console.log("get event " + req.params.event);
    db.get('Events', req.params.event)
    .then(function (result) {
      //console.log(result.body);
      
      //console.log("count = " + result.body.count);
      //console.log(result.body.results[0].value.password);
      if(result.body.count == 0){ 
        console.error("event not found");
        res.status(404).send("no events found"); 
      }
      //console.log("done");
      result.body.eventKey = req.params.event;
      res.status(200).send(result.body); 
    })
    .fail(function (err) {
      console.error("error : count=" + err.body.count);
      res.send(err); 
    });
  });
  
routerAPI.delete('/events/:event', //delete event
  require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    //console.log("user: ");
    //console.log(req.user.username);
    //console.log("delete event " + req.params.event);
    
    
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
        //console.log("Matches for event: " + req.params.event);
        //console.log(result.body.results);
        //res.send(result.body.results);
        matches = result.body.results;

        //console.log("# matches: " + matches.length);
        
        for(var i=0;i<matches.length;i++){
          var iMatch = matches[i].path.key;
          //console.log(i + " - " + iMatch);
          db.remove('Matches', iMatch, true)
            .then(function (result) {
              //console.log(result.body);
              //console.log("match " + matches[i].path.key + " deleted");
              //console.log("deleted");
            })
            .fail(function (err) {
              console.error("Match remove error : " + err);
              res.send(err); 
            });
        }  
        
        //delete event 
        db.remove('Events', req.params.event, true)
        .then(function (result) {
          console.info("event " + req.params.event + " deleted");
          res.sendStatus(200); 
        })
        .fail(function (err) {
          console.error("Event remove error : " + err);
          res.send(err); 
        });
        
      });
      
    
  });
  
routerAPI.post('/events/', //post event
  require('connect-ensure-login').ensureLoggedIn('/auth/login'),
  function(req, res){
    //console.log("user: ");
    //console.log(req.user.username);
    //console.log("add event " + req.body.name);
    //console.log("(req.body.group: " + req.body.group);
    db.post('Events', req.body)
    .then(function (result) {
      if(result.statusCode == "201"){
        
        var promises = [];
        
        console.log("Event added");
        //console.log("create link to user");
        
        promises.push(db.newGraphBuilder()
          .create()
          .from('Users', req.user.username)
          .related('created')
          .to('Events', result.path.key)
          .then(function (result2) {
            //console.log("user link created");
            return true;
          })
        );
        if(req.body.showRepeating){
          //console.log("create repeating event");
          promises.push(db.post('Repeating', req.body)
            .then(function (result2) {
              console.log(" > repeat event");
              //console.log("create link to event");
              //return true;
              
              db.newGraphBuilder()
                .create()
                .from('Repeating', result2.path.key)
                .related('events')
                .to('Events', result.path.key)
                .then(function (result3) {
                  //console.log("events link created");
                  return true;
                });
              
            })
            .fail(function (err) {
              console.error("error " + err);
            })
          );
        }
        
        Q.all(promises) //all promises are now complete (returned true), so send response
          .then(function (content) {
            res.status(201).send(result.path.key);
            //console.log("> done");
          })
          .fail(function (err) {
            console.error("promise error send: " + err);
          });
        
        
        
         
        //res.redirect("/events/" + result.path.key); //should change response for API usage
      }
      else{
        res.status(result.statusCode).send("error");
      }
    })
    .fail(function (err) {
      console.error("error");
      res.send(err); 
    });
  });
  
//GROUP MANAGEMENT


routerAPI.get('/mygroups/', //get my groups
  //require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    if(!req.user){
      //console.error("not logged in");
      res.status(403).send("not logged in");
    }
    else{

      var mygroups = [];
      db.newGraphReader() //GET GROUPS
        .get()
        .from('Users', req.user.username)
        .related('joined')
        .then(function (groupResult) {
          //console.log(groupResult.body.results);
          if(groupResult.body.count == 0){
            res.status(204).send("No groups joined");
            //console.log("no groups");
            throw "no groups";
          }
          for(var a in groupResult.body.results){
            mygroups.push(groupResult.body.results[a].value.name);
          }
          //console.log(mygroups);
          res.send(mygroups);
        });
    }
  });
  
routerAPI.get('/groups/', //get all groups
  //require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    if(!req.user){
      //console.error("not logged in");
      res.status(403).send("not logged in");
    }
    else{

      db.list('Groups', {limit:100})
      .then(function (result2) {

        if(result2.body.count == 0){ 
          //console.log("no events found");
          res.status(200).send("no groups found"); 
        }
        res.send(result2.body); 
      })
      .fail(function (err) {
        console.error("error : " + err.body.message);
        console.log("count=" + err.body.count);
        res.send(err); 
      });
    }
  });
  
  
routerAPI.get('/groups/:group', //get 1 group
  require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    //console.log("user: ");
    //console.log(req.user.username);
    //console.log("get group " + req.params.group);
    db.get('Groups', req.params.group)
    .then(function (result) {
      //console.log(result.body);
      
      //console.log("count = " + result.body.count);
      //console.log(result.body.results[0].value.password);
      if(result.body.count == 0){ 
        console.error("Groups not found");
        res.status(404).send("no groups found"); 
      }
      //console.log("done");
      result.body.groupKey = req.params.group;
      res.send(result.body); 
    })
    .fail(function (err) {
      console.error("error : count=" + err.body.count);
      res.send(err); 
    });
  });
  
routerAPI.post('/groups/', //post group
  require('connect-ensure-login').ensureLoggedIn('/auth/login'),
  function(req, res){
    //console.log("user: ");
    //console.log(req.user.username);
    //console.log("add group " + req.body.name);
    db.post('Groups', req.body)
    .then(function (result) {
      if(result.statusCode == "201"){
        
        var promises = [];
        
        //console.log("status: 201");
        //console.log("create link to user");
        
        promises.push(db.newGraphBuilder()
          .create()
          .from('Users', req.user.username)
          .related('created')
          .to('Groups', result.path.key)
          .then(function (result2) {
            //console.log("link created");
            return result;
          })
          .then(function(result){
            db.newGraphBuilder()
              .create()
              .from('Users', req.user.username)
              .related('joined')
              .to('Groups', result.path.key)
              .then(function (result2) {
                //console.log("link created");
                return true;
              })
          })
        );

        Q.all(promises) //all promises are now complete (returned true), so send response
          .then(function (content) {
            res.status(201).send(result.path.key);
          })
          .fail(function (err) {
            console.error("promise error send: " + err);
          });
        
        
        //console.log("done");
         
        //res.redirect("/events/" + result.path.key); //should change response for API usage
      }
      else{
        res.status(result.statusCode).send("error");
      }
    })
    .fail(function (err) {
      console.error("error");
      res.send(err); 
    });
  });
  
routerAPI.post('/groups/:group/members', //join group
  require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    //console.log("user: ");
    //console.log(req.user.username);
    //console.log("join group " + req.params.group);
    
    db.newGraphBuilder() //CREATE USER > group LINK
      .create()
      .from('Users', req.user.username)
      .related('joined')
      .to('Groups', req.params.group)
      .then(function (result) {
        //console.log("link created");
        //res.sendStatus(200);
        db.newGraphBuilder() //CREATE GROUP > USER LINK
        .create()
        .from('Groups', req.params.group)
        .related('members')
        .to('Users', req.user.username)
        .then(function (result) {
          //console.log("link created");
          res.sendStatus(200);
          //return true;
        })
        .fail(function (error) {
          console.error("group link error : " + error.body);
          res.sendStatus(500);
          //return true;
        });
      });
  });
  
routerAPI.delete('/groups/:group/members', //leave group
  require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    //console.log("user: ");
    //console.log(req.user.username);
    //console.log("leave group " + req.params.group);
    
    db.newGraphBuilder() //REMOVE USER > GROUP LINK
      .remove()
      .from('Users', req.user.username)
      .related('joined')
      .to('Groups', req.params.group)
      .then(function (result) {
        //console.log("link removed");
        //res.sendStatus(200);
        db.newGraphBuilder() //REMOVE GROUP > USER LINK
          .remove()
          .from('Groups', req.params.group)
          .related('members')
          .to('Users', req.user.username)
          .then(function (result) {
            //console.log("link removed");
            res.sendStatus(200);
          });
      });
    
    
  });
  
  
////REPEATING EVENT MANAGEMENT

routerAPI.get('/repeating', //get all repeating events
  require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    if(!req.user){
      //console.error("not logged in");
      res.status(403).send("not logged in");
    }
    else{
      //console.log("list all repeating events");
      db.list('Repeating') //will eventually change to accomodate multiple organisations
      .then(function (result2) {
        //console.log(result.body);
        
        //console.log("count = " + result2.body.count);
        //console.log(result.body.results[0].value.password);
        if(result2.body.count == 0){ 
          //console.log("no events found");
          res.status(200).send("no events found"); 
        }
        //console.log("done");
        res.send(result2.body); 
      })
      .fail(function (err) {
        console.error("error : count=" + err.body.count);
        res.send(err); 
      });
    }
  });
  

routerAPI.delete('/repeating/:event', //delete repeating event
  require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    //console.log("user: ");
    //console.log(req.user.username);
    //console.log("delete event " + req.params.event);
    
    //delete repeating event 
    db.remove('Repeating', req.params.event, true)
    .then(function (result) {
      console.info("repeating event " + req.params.event + " deleted");
      res.sendStatus(200); 
    })
    .fail(function (err) {
      console.error("Repeating Event remove error : " + err);
      res.send(err); 
    });
        
  });
  
  
////MATCH MANAGEMENT

routerAPI.get('/events/:event/matches/', //get all matches
  //require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    // if(!req.user){
    //   //console.error("not logged in");
    //   res.status(403).send("not logged in");
    // }
    // else{
      //console.log("user: ");
      //console.log(req.user.username);
      //console.log("list all matches");
      
      //NEED TO GRAPH SEARCH
      //res.sendStatus(503);
      db.newGraphReader()
        .get()
        .from('Events', req.params.event)
        .related('contains')
        .then(function (result) {
          //console.log("Matches for event: " + req.params.event);
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
              .withoutFields('value.password', 'value.salt')
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
      
  //}
  });
  
  
routerAPI.get('/events/:event/matches/:match', //get 1 match
  //require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    db.get('Matches', req.params.match)
    .then(function (matchResult) {
      if(matchResult.body.count == 0){ 
        console.error("match not found");
        res.status(404).send("no matches found"); 
      }
      console.log("gotten match");
      db.get('Events', req.params.event)
      .then(function (eventResult) {
        console.log("gotten event");
        matchResult.body.event = eventResult.body;
        res.send(matchResult.body);
      })
      .fail(function (err) {
        console.error("error : count=" + err.body.count);
        res.send(err); 
      });
    })
    .fail(function (err) {
      console.error("error : count=" + err.body.count);
      res.send(err); 
    });
  });
  
routerAPI.post('/events/:event/matches/:match/players', //join match
  require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    //console.log("user: ");
    //console.log(req.user.username);
    //console.log("join match " + req.params.match);
    
    db.newGraphBuilder() //CREATE USER > MATCH LINK
      .create()
      .from('Users', req.user.username)
      .related('playing')
      .to('Matches', req.params.match)
      .then(function (result) {
        //console.log("link created");
        //res.sendStatus(200);
        db.newGraphBuilder() //CREATE MATCH > USER LINK
          .create()
          .from('Matches', req.params.match)
          .related('players')
          .to('Users', req.user.username)
          .then(function (result) {
            //console.log("link created");
            res.sendStatus(200);
          });
      });
    
  });
  
routerAPI.delete('/events/:event/matches/:match/players', //leave match
  require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    //console.log("user: ");
    //console.log(req.user.username);
    //console.log("leave match " + req.params.match);
    
    db.newGraphBuilder() //REMOVE USER > MATCH LINK
      .remove()
      .from('Users', req.user.username)
      .related('playing')
      .to('Matches', req.params.match)
      .then(function (result) {
        //console.log("link removed");
        //res.sendStatus(200);
        db.newGraphBuilder() //REMOVE MATCH > USER LINK
          .remove()
          .from('Matches', req.params.match)
          .related('players')
          .to('Users', req.user.username)
          .then(function (result2) {
            //console.log("link removed");
            res.sendStatus(200);
          });
      });
    
    
  });
  
routerAPI.post('/events/:event/matches/:match/bring', //bring game
  require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    //console.log("user: ");
    //console.log(req.user.username);
    //console.log("bring game " + req.params.match);
    
    db.newGraphBuilder() //CREATE USER > MATCH BRING LINK
      .create()
      .from('Users', req.user.username)
      .related('canBring')
      .to('Matches', req.params.match)
      .then(function (result) {
        //console.log("link created");
        //res.sendStatus(200);
        db.newGraphBuilder() //CREATE MATCH BRING > USER LINK
          .create()
          .from('Matches', req.params.match)
          .related('canBring')
          .to('Users', req.user.username)
          .then(function (result) {
            //console.log("link created");
            res.sendStatus(200);
      });
      });
    
  });
  
routerAPI.delete('/events/:event/matches/:match/bring', //not bring a game
  require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    //console.log("user: ");
    //console.log(req.user.username);
    //console.log("not bring game " + req.params.match);
    
    db.newGraphBuilder() //REMOVE USER > MATCH BRING LINK
      .remove()
      .from('Users', req.user.username)
      .related('canBring')
      .to('Matches', req.params.match)
      .then(function (result) {
        //console.log("link removed");
        //res.sendStatus(200);
        db.newGraphBuilder() //REMOVE MATCH BRING > USER LINK
          .remove()
          .from('Matches', req.params.match)
          .related('canBring')
          .to('Users', req.user.username)
          .then(function (result) {
            //console.log("link removed");
            res.sendStatus(200);
          });
      });
    
    
  });
  
routerAPI.post('/events/:event/matches/:match/teach', //teach game
  require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    //console.log("user: ");
    //console.log(req.user.username);
    //console.log("teach game " + req.params.match);
    
    db.newGraphBuilder() //CREATE USER > MATCH BRING LINK
      .create()
      .from('Users', req.user.username)
      .related('canTeach')
      .to('Matches', req.params.match)
      .then(function (result) {
        //console.log("link created");
        //res.sendStatus(200);
        db.newGraphBuilder() //CREATE MATCH BRING > USER LINK
          .create()
          .from('Matches', req.params.match)
          .related('canTeach')
          .to('Users', req.user.username)
          .then(function (result) {
            //console.log("link created");
            res.sendStatus(200);
          });
      });
    
  });
  
routerAPI.delete('/events/:event/matches/:match/teach', //not teach a game
  require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    //console.log("user: ");
    //console.log(req.user.username);
    //console.log("not teach game " + req.params.match);
    
    db.newGraphBuilder() //REMOVE USER > MATCH BRING LINK
      .remove()
      .from('Users', req.user.username)
      .related('canTeach')
      .to('Matches', req.params.match)
      .then(function (result) {
        //console.log("link removed");
        //res.sendStatus(200);
        db.newGraphBuilder() //REMOVE MATCH BRING > USER LINK
          .remove()
          .from('Matches', req.params.match)
          .related('canTeach')
          .to('Users', req.user.username)
          .then(function (result) {
            //console.log("link removed");
            res.sendStatus(200);
          });
      });
    
    
  });
  
routerAPI.delete('/events/:event/matches/:match', //delete match
  require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    //console.log("user: ");
    //console.log(req.user.username);
    //console.log("delete match " + req.params.match);
    db.remove('Matches', req.params.match, true)
    .then(function (result) {
      res.sendStatus(200); 
    })
    .fail(function (err) {
      console.error("error : " + err.body);
      res.send(err.body); 
    });
  });
  
routerAPI.post('/events/:event/matches/:match/comments', //post comment
  require('connect-ensure-login').ensureLoggedIn('/auth/login'),
  function(req, res){
    //console.log("user: ");
    //console.log(req.user.username);
    console.log("add comment " + req.params.event + "/" + req.params.match + "/" + req.user.username);
    //console.log(req.body);
    db.post('Comments', req.body)
    .then(function (commentResult) {
      if(commentResult.statusCode == "201"){
        console.log("comment added");
        console.log("create links");
        console.log("comment key: " + commentResult.path.key);
        db.newGraphBuilder()
        .create()
        .from('Users', req.user.username)
        .related('posted')
        .to('Comments', commentResult.path.key)
        .then(function (userLinkResult) {
          console.log("user link created");
          db.newGraphBuilder()
            .create()
            .from('Matches', req.params.match)
            .related('comments')
            .to('Comments', commentResult.path.key)
            .then(function (matchLinkResult) {
              console.log("match link created");
              res.status(201).send(commentResult.path.key);
            })
            .fail(function (err) {
              console.error("match link error: " + err.body);
              res.status(500).send("error: " + err.body);
            });
        })
        .fail(function (err) {
          console.error("user link error: " + err.body);
          res.status(500).send("error: " + err.body);
        });
        //console.log("done");
        //res.redirect("/events/" + result.path.key); //should change response for API usage
      }
      else{
        res.status(commentResult.statusCode).send("error");
      }
    })
    .fail(function (err) {
      console.log("other error");
      console.error(err.body);
      res.status(500).send(err.body); 
    });
  });
  
  
routerAPI.post('/events/:event/matches/', //post match
  require('connect-ensure-login').ensureLoggedIn('/auth/login'),
  function(req, res){
    //console.log("user: ");
    //console.log(req.user.username);
    console.log("add match " + req.body.game);
    //console.log(req.body);
    db.post('Matches', req.body)
    .then(function (matchResult) {
      if(matchResult.statusCode == "201"){
        console.log("match added");
        console.log("create links");
        console.log("user key: " + req.user.username);
        console.log("event key: " + req.params.event);
        console.log("match key: " + matchResult.path.key);
        db.newGraphBuilder()
        .create()
        .from('Users', req.user.username)
        .related('created')
        .to('Matches', matchResult.path.key)
        .then(function (userLinkResult) {
          console.log("user link created");
          db.newGraphBuilder()
            .create()
            .from('Events', req.params.event)
            .related('contains')
            .to('Matches', matchResult.path.key)
            .then(function (eventLinkResult) {
              console.log("event link created");
              db.newGraphBuilder()
                .create()
                .from('Matches', matchResult.path.key)
                .related('event')
                .to('Events', req.params.event)
                .then(function (eventLinkResult) {
                  console.log("reverse event link created");
                  res.status(201).send(matchResult.path.key);
                })
                .fail(function (err) {
                  console.error("reverse event link error: " + err.body);
                  res.status(500).send("error: " + err.body);
                });
              //res.status(201).send(matchResult.path.key);
            })
            .fail(function (err) {
              console.error("event link error: " + err.body);
              res.status(500).send("error: " + err.body);
            });
        })
        .fail(function (err) {
          console.error("user link error: " + err.body);
          res.status(500).send("error: " + err.body);
        });
        //console.log("done");
        //res.redirect("/events/" + result.path.key); //should change response for API usage
      }
      else{
        res.status(matchResult.statusCode).send("error");
      }
    })
    .fail(function (err) {
      console.log("other error");
      console.error(err.body);
      res.status(500).send(err.body); 
    });
  });
  
routerAPI.get('/events/:event/matches/:match/comments', //get comments
  require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    if(!req.user){
      //console.error("not logged in");
      res.status(403).send("not logged in");
    }
    else{
      db.newGraphReader()
        .get()
        .from('Matches', req.params.match)
        .related('comments')
        .then(function (result) {
          //console.log(result.body.results);
          //return result.body.results; //////////////////////
          res.send(result.body.results);
        });
    }
  });
  
routerAPI.get('/events/:event/matches/:match/players', //get players
  //require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    // if(!req.user){
    //   //console.error("not logged in");
    //   res.status(403).send("not logged in");
    // }
    // else{
      //console.log("user: ");
      //console.log(req.user.username);
        //console.log("list all players");
      
      //NEED TO GRAPH SEARCH
      //res.sendStatus(503);
      var players = db.newGraphReader()
        .get()
        .from('Matches', req.params.match)
        .withoutFields('value.password', 'value.salt') 
        .related('players')
        .then(function (result) {
          //console.log("gotten players");
          return result.body.results;
        })
        .then(function(playerList){
          var promises = []; 
          //var promises2 = []; 
          
          promises.push(db.newGraphReader() //get players for each match that canBring game
            .get()
            .from('Matches', req.params.match)
            .withoutFields('value.password', 'value.salt') 
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
              console.error("player error 1: " + err);
            })
          );
          
          promises.push(db.newGraphReader() //get players for each match that canTeach game
            .get()
            .from('Matches', req.params.match)
            .withoutFields('value.password', 'value.salt')
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
              console.error("player error 2: " + err);
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
            console.error("player error send: " + err);
          });
            
            
          //res.send(playerList);
        })
        .fail(function(err){
          console.error(err);
        });
    
  });
  
routerAPI.get('/mymatches', //get my matches
  require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    if(!req.user){
      //console.error("not logged in");
      res.status(403).send("not logged in");
    }
    else{
      //console.log("user: ");
      //console.log(req.user.username);   
      //console.log("list my matches");
      
      var matches = db.newGraphReader()
        .get()
        .from('Users', req.user.username)
        .related('playing')
        .then(function (result) {
          //console.log(result.body.count);
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
                console.error("event error : " + err);
              })
            );
            
            promises2.push(db.newGraphReader() //get players for each match
              .get()
              .from('Matches', matchlist[i].path.key)
              .withoutFields('value.password', 'value.salt')
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
                console.error("player error : " + err);
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
            console.error("player error : " + err);
          });
          
          return true;
        })
        .fail(function (err) {
          res.status(500).send(err);
        });
    }
  });

module.exports = routerAPI;
