var express = require('express');
var routerAPI = express.Router();

var db = require('orchestrate')("725c04b3-ad74-44c6-9c9e-9316e68788cd");

db.ping()
.then(function () {
  // you key is VALID
})
.fail(function (err) {
  // your key is INVALID
  console.log(err);
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
  }
  var bgg = require('bgg')(options);
  bgg('users', {name: req.params.username})
  .then(function(results){
    res.send("Name: " + results.user.firstname.value + " " + results.user.lastname.value);
    //res.sendStatus(200);
    console.log(results);

  });
});



//EVENT MANAGEMENT


routerAPI.get('/events/', //get all events
  //require('connect-ensure-login').ensureLoggedIn('/login'),
  function(req, res){
    if(!req.user){
      res.status(403).send("not logged in");
    }
    console.log("user: ");
    console.log(req.user.username);
    console.log("list all events");
    db.search('Events', 'value.organisation: "NOBOG"') //will eventually change to accomodate multiple organisations
    .then(function (result) {
      //console.log(result.body);
      
      console.log("count = " + result.body.count);
      //console.log(result.body.results[0].value.password);
      if(result.body.count == 0){ 
        console.log("no events found");
        res.status(404).send("no events found"); 
      }
      console.log("done");
      res.send(result.body); 
    })
    .fail(function (err) {
      console.log("error : count=" + err.body.count);
      res.send(err); 
    });
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
    console.log(req.user.value.username);
    console.log("add event " + req.body.name);
    db.post('Events', {
      "name" : req.body.name,
      "date" : req.body.date,
      "time" : req.body.time,
      "description" : req.body.desc,
      "organisation" : req.body.organisation
      })
    .then(function (result) {
      if(result.statusCode == "201"){
        console.log("status: 201");
        console.log("create link to user");
        db.newGraphBuilder()
        .create()
        .from('Users', req.user.path.key)
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
  
  

module.exports = routerAPI;
