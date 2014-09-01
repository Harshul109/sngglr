'use strict';

var app = angular.module('sngglr', ['ui.router', 'ngResource']);

app.config(function($stateProvider, $urlRouterProvider) {

  $urlRouterProvider.otherwise('/');

  $stateProvider
    .state('home', {
      url: '/',
      templateUrl: 'partials/home.html'
    })

    .state('login', {
      url: '/login',
      templateUrl: 'partials/login.html',
      controller: 'LoginController'
    })

    .state('new', {
      url: '/new',
      templateUrl: 'partials/new.html',
      controller: 'NewController'
    })

    .state('profile', {
      url: '/profile',
      templateUrl: 'partials/profile.html',
      controller: 'ProfileController'
    })

    .state('play', {
      url: '/play',
      templateUrl: 'partials/play.html',
      controller: 'PlayController'
    })

    .state('matches', {
      url: '/matches',
      templateUrl: 'partials/matches.html',
      controller: 'MatchesController'
    })

    .state('match', {
      url: '/matches/:match',
      templateUrl: 'partials/match.html',
      controller: 'MatchController'
    })

    .state('forgot', {
      url: '/forgot',
      templateUrl: 'partials/forgot.html',
      controller: 'ForgotController'
    })

    .state('reset', {
      url: '/reset/:reset',
      templateUrl: 'partials/reset.html',
      controller: 'ResetController'
    })

    .state('confirmation', {
      url: '/confirmation/:token',
      controller: 'ConfirmationController'
    });
 });

app.service('User', function($resource) {
  return $resource('/api/users/:id', {id: '@id'}, {login: {url: '/api/login'}, me: {url: '/api/users/me', method: 'GET'}, like: {method: 'POST', url:'/api/users/:id/like'}, addPicture: {method: 'POST', url: '/api/users/:id/pictures'}, update: {method: 'PUT'}, logout: {method: 'DELETE', url: '/api/logout'}});
});

app.service('Picture', function($resource){
  return $resource('/api/users/:user/pictures/:id', {id: '@_id', user: '@user'}, {first: {method: 'PUT', url: '/api/users/:user/pictures/:id/first'}});
});

app.service('Play', function($resource) {
  return $resource('/api/play');
});

app.service('Match', function($resource) {
  return $resource('/api/users/:user/matches/:id', {id: '@_id', user: '@me._id'});
});

app.service('Chat', function($resource) {
  return $resource('/api/users/:user/matches/:match/chats/:id', {id: '@_id', user: '@user', match: '@match'});
});

app.controller('ConfirmationController', function($scope, $http, $stateParams) {
  console.log($stateParams.token);

  var token = $stateParams.token;
  $http.post('/api/confirmation/' + token)
  .success(function() {
    console.log('wahoo! confirmed');
  })
  .error(function(err) {
    $scope.err = err;
    console.log('fail');
  });
});

app.controller('ResetController', function($scope, $http, $stateParams, $state) {
  console.log($stateParams);

  $scope.reset = function() {
    var token = $stateParams.reset;
    var password = $scope.password;
    $http.post('/api/reset/' + token, {password: password})
    .success(function() {
      $state.go('login');
    })
    .error(function(err) {
      $scope.err = err;
      console.log('fail');
    });
  };
});

app.controller('ForgotController', function(User, $scope, $http) {
  $scope.reset = function() {
    console.log('email');
    var email = $scope.email;

    $http.post('/api/reset', {email: email})
    .success(function() {
      console.log(arguments, 'success');
    })
    .error(function(err) {
      $scope.err = err;
      console.log('FAIL');
    });
  };
});

app.controller('MatchController', function(User, Match, Picture, Chat, $scope, $state, $stateParams) {
  $scope.me = User.me(function(me) {
    $scope.match = Match.get({user: me._id, id: $stateParams.match}, function(match) {
      $scope.other = User.get({id: match.other.user});
      $scope.pictures = Picture.query({user: match.other.user});
      $scope.chats = Chat.query({match: match._id, user: me._id});
    });
  });

  $scope.send = function() {
    var c = new Chat({message: $scope.message, user: $scope.me._id, match: $scope.match._id});
    c.$save(function() {
      $scope.chats = Chat.query({match: $scope.match._id, user: $scope.me._id});
    });
  };

  $scope.unmatch = function() {
    $scope.match.$delete(function() {
      $state.go('matches');
    });
  };
});

app.controller('MatchesController', function(User, Match, Picture, $scope) {
  $scope.me = User.me(function(me) {
    Match.query({user: me._id}, function(matches) {
      for (var i = 0; i < matches.length; ++i) {
        var id = matches[i].other.user;
        matches[i].other = User.get({id: id });
        matches[i].pictures = Picture.query({user: id });
      }
      $scope.matches = matches;
    });
  });
});

app.controller('PlayController', function(User, Play, $scope) {
  $scope.me = User.me();
  $scope.other = Play.get(function() { $scope.err = ''; }, function(err) { $scope.err = err.data; });

  $scope.like = function(likeType, other) {
    $scope.me.$like({id: $scope.me._id, likeType: likeType, other: other}, function() {
      $scope.other = Play.get();
      $scope.err = '';
    }, function(err) { console.log(err); $scope.err = err.data; });
  };
});

app.controller('HeaderController', function(User, $scope, $rootScope, $state) {
  $rootScope.me = User.me();

  $scope.logout = function() {
    $rootScope.me.$logout(function() {
      $rootScope.me = User.me(function() {
        $state.go('home');
      });
    });
  };
});

app.controller('ProfileController', function(User, Picture, $scope) {
  $scope.me = User.me(function(me) {
    $scope.pictures = Picture.query({user: me._id}, function() {
      console.log(arguments);
    });
  });

  $scope.addPicture = function() {
    console.log($scope.me);
    User.addPicture({id: $scope.me._id, url: $scope.picture}, function() {
      $scope.pictures = Picture.query({user: $scope.me._id});
    });
  };

  $scope.deletePicture = function(picture) {
    picture.$delete();
    $scope.pictures = Picture.query({user: $scope.me._id});
  };

  $scope.makeFirst = function(picture) {
    picture.$first();
    $scope.pictures = Picture.query({user: $scope.me._id});
  };
});

app.controller('NewController', function(User, $scope, $rootScope, $state) {
  $scope.create = function() {
    var user = _.pick($scope, 'name', 'email', 'password');
    user = new User(user);
    user.$save(function() {
      $state.go('profile');
      $rootScope.me = User.me();
    });
  };
});

app.controller('LoginController', function($http, $scope, $state, User, $rootScope) {
  $scope.login = function() {
    var email = $scope.email;
    var password = $scope.password;
    $http.post('/api/login', {email: email, password: password})
    .success(function() {
      $rootScope.me = User.me();
      $state.go('home');
    })
    .error(function(err) {
      $scope.err = err;
    });
  };
});
