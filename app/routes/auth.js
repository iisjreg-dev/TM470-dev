var express = require('express');
var routerAuth = express.Router();
var passport = require('passport');
var Strategy = require('passport-local').Strategy;
var SignupStrategy = require('passport-local').Strategy;
var db = require('orchestrate')("725c04b3-ad74-44c6-9c9e-9316e68788cd");

db.ping()
.then(function () {
  // you key is VALID
})
.fail(function (err) {
  // your key is INVALID
  console.log(err);
});

passport.use('local', new Strategy(
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
passport.use('signup', new SignupStrategy(
  function(username, password, cb) {
    //var username = req.body.username;
    //var password = req.body.password;
    var user = {
      "username": username,
      "password": password,
      "id": 0,
      "snippet": "test 2"
    };
    console.log("signing up user : " + username);
    db.search('Users', username) //TODO: need to make this .get() and use usernames as keys!!!
    .then(function (result) {
      console.log('DB success: ' + result.body.count + " results");
      if (result.body.count > 0){
        return cb(null, false, { message: 'username already exists' });
      }
      if (result.body.count == 0){
        console.log('Username is free for use');
        db.post('Users', user)
        .then(function () {
          console.log("POST Success! ");
          db.search('Users', username)
          .then(function (result2) {
            console.log("re-get - user: " + result2.body.results[0].value.username);
            console.log(user);
            return cb(null, result2.body.results[0]);
          })
          .fail(function (err2) {
          console.log("GET FAIL:");
          console.log(err2.body.details);
          return cb(null, false, { message: 'GET FAIL:' + err2.body });
        });
        })
        .fail(function (err) {
          console.log("PUT FAIL:" + err.body);
          return cb(null, false, { message: 'PUT FAIL:' + err.body });
        });
      }
    })
    .fail(function (result1) {
        console.log('DB FAIL: ' + result1.body.message);
        return cb(null, false, { message: 'DB FAIL: ' + result1.body.message});
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

/* login GET test. to be replaced by client-side login */
routerAuth.get('/login', function(req, res, next) {
  console.log("error messages: " + req.flash('error'));
  var loginPage = "/tests/usertest/login.html";
  res.redirect(loginPage);
});

/* signup GET test. to be replaced by client-side signup */
routerAuth.get('/signup', function(req, res, next) {
  console.log("error messages: " + req.flash('error'));
  var loginPage = "/tests/usertest/signup.html";
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
  
/* login POST test. This should be changed to allow RESTful authentication via Angular*/
routerAuth.post('/signup', 
  passport.authenticate('signup', { failureRedirect: '/auth/signup', failureFlash: true }),
  function(req, res) {
    console.log("Signup Success! user = " + req.user.value.name);
    if(req.session.returnTo){ 
      res.redirect(req.session.returnTo); 
    }
    else{
      res.redirect('/');
    }
  });
  
routerAuth.get('/checkuser/:username',
  function(req, res){
    db.search('Users', req.params.username)
    .then(function (result) {
      console.log('DB success: ' + result.body.count + " results");
      if (result.body.count > 0){
        //return cb(null, false, { message: 'username already exists' });
        res.sendStatus(412);// Precondition Failed?
      }
      else{
        res.sendStatus(200);
      }
    });
    //res.send(req.user);
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
