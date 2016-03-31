var express = require('express');
var routerAuth = express.Router();
var console = require('better-console');
var passport = require('passport');
var Strategy = require('passport-local').Strategy;
var SignupStrategy = require('passport-local').Strategy;
const crypto = require('crypto');
var db = require('orchestrate')("725c04b3-ad74-44c6-9c9e-9316e68788cd");

db.ping()
.then(function () {
  // you key is VALID
})
.fail(function (err) {
  // your key is INVALID
  console.error(err);
});

function hashedPW(password, salt){
  var key = crypto.pbkdf2Sync(password, salt, 100000, 512, 'sha512');
  return key.toString('hex');
}

passport.use('local', new Strategy(
  function(username, password, cb) {
    db.get('Users', username)
    .then(function (result) {
      console.log("authenticating...");
      var user = result.body;
      //console.log("count = " + result.body.count);
      //console.log("password = " + result.body.results[0].value.password);
      // if(result.body.count == 0){ 
      //   console.log("no user found");
      //   return cb(null, false, { message: 'no user.' }); 
      // }
      
      //check salt and hash
      if(user.password != hashedPW(password,user.salt)) { 
        console.log("password incorrect");
        return cb(null, false, { message: 'Incorrect password.' }); 
      }
      console.log("done");
      return cb(null, user);
    })
    .fail(function (err) {
      console.log("error : count=" + err);
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
    
    //hash and salt
    var buf = crypto.randomBytes(256);
    var salt = buf.toString('hex'); //check*
    
    var user = {
      "username": username,
      "password": hashedPW(password,salt),
      "salt": salt,
      "id": 0,
      "snippet": "test 2",
      "name": ""
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
        db.put('Users', username, user)
        .then(function () {
          console.log("POST Success! ");
          db.get('Users', username)
          .then(function (result2) {
            console.log("re-get - user: " + result2.body.username);
            //    console.log(result2.body);
            return cb(null, result2.body);
          })
          .fail(function (err2) {
          console.log("GET FAIL:");
          console.log(err2);
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
  //console.log(user);
  console.log("key = " + user.username);
  cb(null, user.username);
});

passport.deserializeUser(function(id, cb) {
  console.log("deserializeUser:");
  console.log("id = " + id);
  db.get('Users', id)
    .then(function (result) {
      console.log("done");
      return cb(null, result.body);
    })
    .fail(function (err) {
      console.log("error : count=" + err);
      return cb(err);
    });
});
//END OF PASSPORT
//
//



routerAuth.get('/', //sends 200 status if logged in
  function(req, res) {
    if(req.user){
      console.log("user exists: " + req.user.value.name);
      res.sendStatus(200);
      //res.send(req.user.value.name + " - " + req.user.value.snippet);
      
    }
    else{
      console.error("user does not exist");
      res.status(401).send("user does not exist");
    }
  });
  
routerAuth.get('/user', //returns user object
  function(req, res) {
    if(req.user){
      res.send(req.user);
    }
    else{
      console.error("user does not exist");
      res.status(401).send("user does not exist");
    }
  });

// /* login GET test. to be replaced by client-side login */
// routerAuth.get('/login', function(req, res, next) {
//   console.log("error messages: " + req.flash('error'));
//   var loginPage = "/tests/usertest/login.html";
//   res.redirect(loginPage);
// });

// /* signup GET test. to be replaced by client-side signup */
// routerAuth.get('/signup', function(req, res, next) {
//   console.log("error messages: " + req.flash('error'));
//   var loginPage = "/tests/usertest/signup.html";
//   res.redirect(loginPage);
// });




/* login POST test. This should be changed to allow RESTful authentication via Angular*/
routerAuth.post('/login', 
  function(req, res, next){
    console.log("signing in");
    console.log(req.body);
    next();
  },
  passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }),
  function(req, res) {
    console.log("login done");
    //console.log(req.user);
    console.log("Login Success! user = " + req.user.username);
    if(req.session.returnTo){ 
      res.redirect(req.session.returnTo); 
    }
    else{
      res.redirect('/main');
    }
  });
  
/* login POST test. This should be changed to allow RESTful authentication via Angular*/
routerAuth.post('/signup', 
  passport.authenticate('signup', { failureRedirect: '/signup', failureFlash: true }),
  function(req, res) {
    console.log("signup done");
    //console.log(req.user);
    console.log("Signup Success! user = " + req.user.username);
    if(req.session.returnTo){ 
      res.redirect(req.session.returnTo); 
    }
    else{
      res.redirect('/account');
    }
  });
  
routerAuth.post('/update',  
  function(req, res) {
    //console.log(req.body); 
    //var update = JSON.parse(Object.keys(req.body)[0]);
    if(req.user){
      console.log("update " + req.user.username + "/" + req.body.username);
      if(req.body.password){
        //hash and salt
        var buf = crypto.randomBytes(256);
        var salt = buf.toString('hex'); //check*
        
        
        db.newPatchBuilder('Users', req.body.username)
        .replace('snippet', req.body.snippet)
        .replace('name', req.body.name)
        .replace('password', hashedPW(req.body.password,salt))
        .replace('salt', salt)
        .apply()
        .then(function (result) {
            // All changes were applied successfully
            console.log("update success");
            res.sendStatus(200);
        })
        .fail(function (err) {
            // No changes were applied
            console.log(err.body);
            res.sendStatus(500);
        });
      }
      else{
        db.newPatchBuilder('Users', req.body.username)
        .replace('snippet', req.body.snippet)
        .replace('name', req.body.name)
        .apply()
        .then(function (result) {
            // All changes were applied successfully
            console.log("update success");
            res.sendStatus(200);
        })
        .fail(function (err) {
            // No changes were applied
            console.log(err.body);
            res.sendStatus(500);
        });
      }
    }
    else{
      console.log("update failed - not logged in");
      res.sendStatus(401);
    }
    
    
    // if(req.session.returnTo){ 
    //   res.redirect(req.session.returnTo); 
    // }
    // else{
    //   res.redirect('/');
    // }
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
    res.sendStatus(200);
  });
  
// routerAuth.get('/profile',
//   require('connect-ensure-login').ensureLoggedIn('/auth/login'),
//   function(req, res){
//     res.send(req.user);
//   });

module.exports = routerAuth;
