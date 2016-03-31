'use strict';

// Declare app level module which depends on filters, and services

angular.module('TM470', [
  'ngRoute',
  'TM470.controllers',
  'TM470.filters',
  'TM470.services',
  'TM470.directives'
]).
config(function ($routeProvider, $locationProvider) {
  $routeProvider.
    when('/', {
      templateUrl: 'views/about.html',
      controller: 'mainController'
    }).
    when('/events', {
      templateUrl: 'views/events.html',
      controller: 'eventsController'
    }).
    when('/login', {
      templateUrl: 'views/login.html',
      controller: 'loginController'
    }).
    when('/signup', {
      templateUrl: 'views/signup.html',
      controller: 'signupController'
    }).
    when('/account', {
      templateUrl: 'views/account.html',
      controller: 'accountController'
    }).
    when('/main', {
      templateUrl: 'views/main.html',
      controller: 'aboutController'
    }).
    otherwise({
      redirectTo: '/'
    });

  $locationProvider.html5Mode(true);
});
