'use strict';

angular.module('vcApp')
  .factory('Session', function ($resource) {
    return $resource('/api/session/');
  });
