(function () {
  'use strict';

  // Authentication service for user variables

  angular
    .module('users.services')
    .factory('Authentication', Authentication);

  Authentication.$inject = ['$window'];

  function Authentication($window) {
    var auth = {
      user: $window.user
    };

    // parsing additional provider data
    if(auth.user && auth.user.additionalProvidersData)
      auth.user.additionalProvidersData = JSON.parse(auth.user.additionalProvidersData);

    return auth;
  }
}());
