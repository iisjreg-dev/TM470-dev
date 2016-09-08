'use strict';

// Declare app level module which depends on filters, and services

angular.module('TM470', [
  'ngRoute',
  'TM470.controllers',
  'TM470.filters',
  'TM470.services',
  'TM470.directives',
  'ngSanitize',
  'wt.responsive',
  'angular-table',
  'monospaced.qrcode',
  'updateMeta'
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
    when('/events/:event', {
      templateUrl: 'views/event.html',
      controller: 'eventController'
    }).
    when('/events/:event/matches/:match', {
      templateUrl: 'views/match.html',
      controller: 'matchController'
    }).
    when('/repeating', {
      templateUrl: 'views/repeating.html',
      controller: 'repeatingController'
    }).
    when('/mymatches/', {
      templateUrl: 'views/mymatches.html',
      controller: 'mymatchController'
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
    when('/new-account', {
      templateUrl: 'views/account_new.html',
      controller: 'newAccountController'
    }).
    when('/main', {
      templateUrl: 'views/main.html',
      controller: 'aboutController'
    }).
    when('/groups', {
      templateUrl: 'views/groups.html',
      controller: 'groupsController'
    }).
    when('/group', {
      templateUrl: 'views/group.html',
      controller: 'groupController'
    }).
    otherwise({
      //failure("404");
      redirectTo: '/'
    });

  $locationProvider.html5Mode(true);
});
