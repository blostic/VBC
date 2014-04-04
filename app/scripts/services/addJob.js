'use strict';

angular.module('vcApp')
    .factory('AddJob', function($http, $cookieStore) {
        return {
            addJob: function(accessLevel, role) {
                alert('WYSYLAM POSTA');
                $http.post('/api/addJob', user).success(function(res) {
                    alert(res);
                    success();
                }).error(error);
            }
        };
    });
