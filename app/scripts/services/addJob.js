'use strict';

angular.module('vcApp')
    .factory('AddJob', function($http, $cookieStore) {
        return {
            addJob: function(user, success, error) {
                $http.post('/api/addJob', user).success(function(res) {
                    success();
                }).error(function(res) {
                    alert(res);
                });
            }
        };
    });
