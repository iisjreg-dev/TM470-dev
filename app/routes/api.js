var express = require('express');
var router = express.Router();



/* GET home page. */
router.get('/', function(req, res, next) {
  res.sendStatus(200);
});

/* BGG test. */
router.get('/bgg/user/:username', function(req, res, next) {

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


module.exports = router;
