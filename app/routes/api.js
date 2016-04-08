var express = require('express');
var routerAPI = express.Router();
var console = require('better-console');

var db = require('orchestrate')("725c04b3-ad74-44c6-9c9e-9316e68788cd");

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
        initial: 100,
        multiplier: 2,
        max: 15e3
    }
  };
  var bgg = require('bgg')(options);
  var game = decodeURIComponent(req.params.game);
  console.log(game);
  bgg('search', {query: game, type: 'boardgame,boardgameexpansion'})
  .then(function(results){
    res.send(results.items);
    //res.sendStatus(200);
    console.log(results.items);

  });
});

routerAPI.get('/bgg/game/:gameId', function(req, res, next) { //GET GAME DETAIL
  console.log("get game");
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
  var gameId = req.params.gameId;
  console.log(gameId);
  bgg('thing', {id: gameId, type: "boardgame"})
  .then(function(results){
    res.send(results.items.item);
    //res.sendStatus(200);
    console.log(results.items.item);
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
      console.log("list all events");
      db.list('Events') //will eventually change to accomodate multiple organisations
      .then(function (result) {
        //console.log(result.body);
        
        console.log("count = " + result.body.count);
        //console.log(result.body.results[0].value.password);
        if(result.body.count == 0){ 
          console.log("no events found");
          res.status(404).send("no events found"); 
        }
        //console.log("done");
        res.send(result.body); 
      })
      .fail(function (err) {
        console.log("error : count=" + err.body.count);
        res.send(err); 
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
  
routerAPI.post('/events/', //post event
  require('connect-ensure-login').ensureLoggedIn('/auth/login'),
  function(req, res){
    console.log("user: ");
    console.log(req.user.username);
    console.log("add event " + req.body.name);
    db.post('Events', req.body)
    .then(function (result) {
      if(result.statusCode == "201"){
        console.log("status: 201");
        console.log("create link to user");
        db.newGraphBuilder()
        .create()
        .from('Users', req.user.username)
        .related('created')
        .to('Events', result.path.key)
        .then(function (res) {
          console.log("link created");
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
      res.send(err); 
    });
  });
  
  
////MATCH MANAGEMENT

routerAPI.get('/events/:event/matches/', //get all matches
  //require('connect-ensure-login').ensureLoggedIn('/login'),
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
          res.send(result.body.results);
        });
    }
  });
  
  
routerAPI.get('/events/:event/matches/:match', //get 1 event
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
        console.log("no maatches found");
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
  
routerAPI.post('/events/:event/matches/', //post event
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
        console.log("event key: " + req.body.eventKey);
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
        .from('Events', req.body.eventKey)
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
  

module.exports = routerAPI;
