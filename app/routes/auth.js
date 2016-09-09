var express = require('express');
var routerAuth = express.Router();
var console = require('better-console');
var passport = require('passport');
var Strategy = require('passport-local').Strategy;
var SignupStrategy = require('passport-local').Strategy;
const crypto = require('crypto');
var db = require('orchestrate')(process.env.API_KEY);


function hashedPW(password, salt){
  return new Buffer(crypto.pbkdf2Sync(password, salt, 25000, 512, 'sha512'), 'binary').toString('base64');
}

passport.use('local', new Strategy(
  function(username, password, cb) {
    db.get('Users', username)
    .then(function (result) {
      //console.log("authenticating...");
      var user = result.body;
      // console.log("DB username:");
      // console.log(result.body.username);
      // console.log("DB salt:");
      // console.log(result.body.salt);
      //console.log("count = " + result.body.count);
      //console.log("password = " + result.body.results[0].value.password);
      // if(result.body.count == 0){ 
      //   console.log("no user found");
      //   return cb(null, false, { message: 'no user.' }); 
      // }
      
      //check salt and hashhashedPW(password,user.salt)
      var theHash = hashedPW(password,user.salt);
      if(user.password != theHash) { 
        console.error("password incorrect");
        return cb(null, false, { message: 'Incorrect password.' }); 
      }
      //console.log("done");
      return cb(null, user);
    })
    .fail(function (err) {
      console.error("error : " + err);
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
    //var buf = crypto.randomBytes(256);          
    //var salt = buf.toString('hex'); //check*
    var salt = new Buffer(crypto.randomBytes(512)).toString('hex');
    // console.log("Gen salt:");
    // console.log(salt);
    var user = {
      "username": username,
      "password": hashedPW(password,salt),
      "salt": salt,
      "id": 0,
      "snippet": "",
      "name": ""
    };
    //console.log("signing up user : " + username);
    db.get('Users', username, null, { 'without_fields': ['value.password', 'value.salt']}) 
    .then(function (result) {
      //console.log('DB: ' + result.body.count + " results");
      if (result.body.count > 0){
        //console.log("username already exists");
        return cb(null, false, { message: 'username already exists' });
      }
      if (result.body.count == 0){
        //console.log('Username is free for use');
        db.put('Users', username, user)
        .then(function () {
          //console.log("POST Success! ");
          db.get('Users', username, null, { 'without_fields': ['value.password', 'value.salt']})
          .then(function (result2) {
            //console.log("re-get - user: " + result2.body.username);
            //    console.log(result2.body);
            return cb(null, result2.body);
          })
          .fail(function (err2) {
          console.error("GET FAIL:");
          console.error(err2);
          return cb(null, false, { message: 'GET FAIL:' + err2.body });
        });
        })
        .fail(function (err) {
          console.error("PUT FAIL:" + err.body);
          return cb(null, false, { message: 'PUT FAIL:' + err.body });
        });
      }
    })
    .fail(function (result1) {
        //console.log('DB FAIL: ' + result1.body.message);
        if(result1.body.code == "items_not_found"){
          //console.log('Username is free for use');
          db.put('Users', username, user)
          .then(function () {
            //console.log("POST Success! ");
            db.get('Users', username, null, { 'without_fields': ['value.password', 'value.salt']})
            .then(function (result2) {
              //console.log("re-get - user: " + result2.body.username);
              //    console.log(result2.body);
              return cb(null, result2.body);
            })
            .fail(function (err2) {
            console.error("GET FAIL:");
            console.error(err2);
            return cb(null, false, { message: 'GET FAIL:' + err2.body });
          });
          })
          .fail(function (err) {
            console.error("PUT FAIL:" + err.body);
            return cb(null, false, { message: 'PUT FAIL:' + err.body });
          });
        }
        return cb(null, false, { message: 'DB FAIL: ' + result1.body.message});
    });
  })
);

passport.serializeUser(function(user, cb) {
  //console.log("serializeUser: " + user.username);
  //console.log(user);
  //console.log("key = " + user.username);
  cb(null, user.username);
});

passport.deserializeUser(function(id, cb) {
  //console.log("deserializeUser: " + id);
  //console.log("id = " + id);
  db.get('Users', id, null, { 'without_fields': ['value.password', 'value.salt']})
    .then(function (result) {
      //console.log("done");
      return cb(null, result.body);
    })
    .fail(function (err) {
      console.error("error : count=" + err);
      return cb(err);
    });
});
//END OF PASSPORT
//
//


/* login POST test. This should be changed to allow RESTful authentication via Angular*/
routerAuth.post('/login', 
  function(req, res, next){
    //console.log("signing in");
    //console.log(req.body.username);
    next();
  },
  passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }),
  function(req, res) {
    //console.log("login done");
    //console.log(req.user);
    console.log("Login Success! user = " + req.user.username);
    // if(req.session.returnTo){ 
    //   res.redirect(req.session.returnTo); 
    // }
    // else{
    if(req.user.name){
      res.redirect('/events'); //TODO: Change to status
    }
    else{
      res.redirect('/new-account');
    }
    // }
  });
  
routerAuth.post('/signup', 
  passport.authenticate('signup', { failureRedirect: '/signup', failureFlash: true }),
  function(req, res) {
    //console.log("signup done");
    //console.log(req.user);
    console.info("Signup Success! user = " + req.user.username);
    // if(req.session.returnTo){ 
    //   res.redirect(req.session.returnTo); 
    // }
    // else{
      res.sendStatus(200);
      //res.redirect('/new-account');
    // }
  });
  
routerAuth.post('/update',  
  function(req, res) {
    //console.log(req.body); 
    //var update = JSON.parse(Object.keys(req.body)[0]);
    if(req.user){
      //console.log("update " + req.user.username + "/" + req.body.username);
      if(req.body.password){
        //hash and salt
        //var buf = crypto.randomBytes(256);
        //var salt = buf.toString('hex'); //check*
        var salt = new Buffer(crypto.randomBytes(512)).toString('hex');
        db.newPatchBuilder('Users', req.body.username)
        .replace('snippet', req.body.snippet)
        .replace('name', req.body.name)
        .replace('password', hashedPW(req.body.password,salt))
        .replace('salt', salt)
        .apply()
        .then(function (result) {
            // All changes were applied successfully
            //console.log("update success");
            res.sendStatus(200);
        })
        .fail(function (err) {
            // No changes were applied
            console.error(err.body);
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
            //console.log(result);
            //console.log("update success");
            res.sendStatus(200);
        })
        .fail(function (err) {
            // No changes were applied
            console.error(err.body);
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
  
  
routerAuth.get('/checkuser/:username', //check username is available - returns 200 if username does not exist or 406 if it does
  function(req, res){
    db.get('Users', decodeURIComponent(req.params.username), null, { 'without_fields': ['value.password', 'value.salt']})
    .then(function (result) {
      //console.log('DB success: Users key found');
      if (result.body.username){ //username already exists
        res.sendStatus(406);// Not Acceptable
      }
      else{ //result is not a user, i.e. no result
        //console.log(result.body);
        res.sendStatus(200);
      }
    })
    .fail(function (err) {
      if(err.body.code == "items_not_found"){ //username not found
        res.sendStatus(200);
      }
      //console.log("error: ");
      console.error(err.body.code);
      //console.log(err.body);
    });
  });

routerAuth.get('/logout',
  function(req, res){
    req.logout();
    res.sendStatus(200);
  });

routerAuth.get('/', //sends 200 status if logged in
  function(req, res) {
    if(req.user){
      //console.log("user exists: " + req.user.value.name);
      res.sendStatus(200);
      //res.send(req.user.value.name + " - " + req.user.value.snippet);
      
    }
    else{
      //console.error("user does not exist");
      res.status(401).send("user does not exist");
    }
  });
  
routerAuth.get('/user', //returns user object
  function(req, res) {
    if(req.user){
      res.send(req.user);
    }
    else{
      //console.error("user does not exist");
      res.status(401).send("user does not exist");
    }
  });



module.exports = routerAuth;
