var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var flash= require('connect-flash');

var api = require('./routes/api');
var auth = require('./routes/auth');

var app = express();

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
//app.use(express.static(path.join(__dirname, 'bower_components')));
app.use(require('express-session')({ secret: 'TM470', resave: false, saveUninitialized: false })); //change
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use(function(req, res, next) {
    console.log(">" + req.method + " " + req.path); //log all requests at start of request, because logger only logs request after request is completed.
    next();
});

// app.use(function(req, res, next){
//     res.locals.success_messages = req.flash('success');
//     res.locals.error_messages = req.flash('error');
//     console.log("success messages: " + res.locals.success_messages);
//     console.log("error messages: " + res.locals.error_messages);
//     next();
// });

app.use('/auth', auth);
app.use('/api', api);
app.use('*', function(req, res){
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
