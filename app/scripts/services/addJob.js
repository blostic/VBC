'use strict';

angular.module('vcApp')
    .factory('AddJob', function($http/*, $cookieStore*/) {
        return {
            addJob: function(body, success, error) {
                $http.post('/api/addJob', body).success(function(res) {
                    success(res);
                }).error(function(res) {
                    error(res);
                });
            },
            splitJob: function(body, success, error) {
                $http.post('/api/splitJob', body).success(function(res) {
                    success(res);
                }).error(function(res) {
                    error(res);
                });
            },
            startJob: function(body, success, error) {
                $http.post('/api/startJob', body).success(function(res) {
                    success(res);
                }).error(function(res) {
                    error(res);
                });
            },
            getJobInfo: function(body, success, error) {
                $http.post('/api/jobInfo', body).success(function(res) {
                    success(res);
                }).error(function(res) {
                    error(res);
                });
            }
        };
    });
