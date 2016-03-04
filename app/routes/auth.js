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

passport.use(new Strategy({
    passwordField: 'hash'
  },
  function(username, password, cb) {
    // db.users.findByUsername(username, function(err, user) {
    //   if (err) { return cb(err); }
    //   if (!user) { return cb(null, false); }
    //   if (user.password != password) { return cb(null, false); }
    //   return cb(null, user);
    // });
    db.search('Users', username)
    .then(function (result) {
      //console.log(result);
      console.log("count = " + result.body.count);
      console.log(result.body.results[0].value.password);
      if(result.body.count == 0){ return cb(null, false); }
      if(result.body.results[0].value.password != password) { return cb(null, false); }
      return cb(null, result.body.results[0].value);
    })
    .fail(function (err) {
      console.log("error : count=" + err.body.count);
      return cb(err);
    });
  })
);

passport.serializeUser(function(user, cb) {
  cb(null, user.id);
});

passport.deserializeUser(function(id, cb) {
  db.users.findById(id, function (err, user) {
    if (err) { return cb(err); }
    cb(null, user);
  });
});




/* GET home page. */
routerAuth.get('/',
  function(req, res) {
    res.send(req.user);
  });

/* login GET test. */
routerAuth.get('/login/:user/:hash', function(req, res, next) {

  
});

/* login POST test. */
routerAuth.post('/login', 
  passport.authenticate('local', { failureRedirect: '/' }),
  function(req, res) {
    console.log("Success! user = " + req.user.name);
    res.redirect('/');
  });

routerAuth.get('/logout',
  function(req, res){
    req.logout();
    res.redirect('/');
  });
  
routerAuth.get('/profile',
  //require('connect-ensure-login').ensureLoggedIn(),
  function(req, res){
    res.send(req.user);
  });

module.exports = routerAuth;
