var express = require('express');
var routerAuth = express.Router();
var passport = require('passport');
var Strategy = require('passport-local').Strategy;
var db = require('orchestrate')("725c04b3-ad74-44c6-9c9e-9316e68788cd");

db.ping()
.then(function () {
  // you key is VALID
})
.fail(function (err) {
  // your key is INVALID
  console.log(err);
});

passport.use(new Strategy(
  function(username, password, cb) {
    db.search('Users', username)
    .then(function (result) {
      console.log("authenticating...");
      console.log("count = " + result.body.count);
      //console.log("password = " + result.body.results[0].value.password);
      if(result.body.count == 0){ 
        console.log("no user found");
        return cb(null, false, { message: 'no user.' }); 
      }
      if(result.body.results[0].value.password != password) { 
        console.log("password incorrect");
        return cb(null, false, { message: 'Incorrect password.' }); 
      }
      console.log("done");
      return cb(null, result.body.results[0]);
    })
    .fail(function (err) {
      console.log("error : count=" + err.body.count);
      //return cb(err); //DB failure may not be error, therefore handle as normal
      var dbErr = "DB failure: " + err;
      return cb(null, false, { message: dbErr }); 
    });
  })
);

passport.serializeUser(function(user, cb) {
  console.log("serializeUser:");
  console.log("key = " + user.path.key);
  cb(null, user.path.key);
});

passport.deserializeUser(function(id, cb) {
  console.log("deserializeUser:");
  console.log("id = " + id);
  db.search('Users', id)
    .then(function (result) {
      //console.log(result);
      
      console.log("count = " + result.body.count);
      //console.log(result.body.results[0].value.password);
      if(result.body.count == 0){ 
        console.log("no user found");
        return cb(null, false); 
      }
      console.log("done");
      return cb(null, result.body.results[0]);
    })
    .fail(function (err) {
      console.log("error : count=" + err.body.count);
      return cb(err);
    });
});




/* GET auth home page. checks auth user*/
routerAuth.get('/',
  function(req, res) {
    if(req.user){
      console.log("user exists: " + req.user.value.name);
      res.sendStatus(200);
      //res.send(req.user.value.name + " - " + req.user.value.snippet);
      
    }
    else{
      console.log("user does not exist");
      res.status(401).send("user does not exist");
    }
  });

/* login GET test. */
routerAuth.get('/login', function(req, res, next) {
  var loginPage = "/tests/usertest/login.html";
  res.redirect(loginPage);
});

/* login POST test. This should be changed to allow RESTful authentication via Angular*/
routerAuth.post('/login', 
  passport.authenticate('local', { failureRedirect: '/auth/login', failureFlash: true }),
  function(req, res) {
    console.log("Login Success! user = " + req.user.value.name);
    if(req.session.returnTo){ 
      res.redirect(req.session.returnTo); 
    }
    else{
      res.redirect('/');
    }
  });

routerAuth.get('/logout',
  function(req, res){
    req.logout();
    res.redirect('/');
  });
  
routerAuth.get('/profile',
  require('connect-ensure-login').ensureLoggedIn('/auth/login'),
  function(req, res){
    res.send(req.user);
  });

module.exports = routerAuth;
