var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var console = require('better-console');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var flash= require('connect-flash');
var git = require('git-rev');
var helmet = require('helmet');
require('date-utils');

var api = require('./routes/api');
var auth = require('./routes/auth');

var app = express();


// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

//logging
//console.log("log");
//console.warn("Warning!");
console.info("Started");

git.short(function (str) {
  console.info('GIT version:', str);
});

function pad(str, max) {
  str = str.toString();
  return str.length < max ? pad("0" + str, max) : str;
}
logger.token('id', function getId(req) {
  return req.id;
});
logger.token('fixclfdate', function getclfDate(req) { //needed to remove the extra "+" from the clf date
  var date = new Date();
  return date.toCLFString() + " ||";
});
app.use(logger(':id :fixclfdate :method :url :status :response-time ms - :res[content-length]'));
var requests = 0;
app.use(function(req, res, next) { //increment request counter ---- TODO: think of neater way of doing this without using uuids (too long)
  requests++;
  req.id = pad(requests,5);
  next();
}); 
app.use(function(req, res, next) { //log all requests at start of request, because morgan (logger) only logs request after request is completed.
    var date = new Date();
    console.log(req.id + " " + date.toCLFString() + " >> " + req.method + " " + req.path); 
    next();
});




app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(require('express-session')({ secret: 'TM470', resave: false, saveUninitialized: false })); //change
app.use(passport.initialize());
app.use(passport.session());
app.use(flash()); //NEEDS MORE TESTING
app.use(helmet());

// //flash messages TESTING
// app.use(function(req, res, next){
//     res.locals.success_messages = req.flash('success');
//     res.locals.error_messages = req.flash('error');
//     console.log("success messages: " + res.locals.success_messages);
//     console.log("error messages: " + res.locals.error_messages);
//     next();
// });


app.use('/auth', auth);
app.use('/api', api);
app.use('*', function(req, res){ //catch anything else and send index.html, so that Angular can route
  res.sendFile(__dirname + '/public/index.html');
});




// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    // res.render('error', {
    //   message: err.message,
    //   error: err
    // });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  // res.render('error', {
  //   message: err.message,
  //   error: {}
  // });
});


module.exports = app;
