'use strict';

angular.module('vcApp')
    .controller('LoginCtrl', function($rootScope, $scope, Auth, $location) {
        $scope.rememberme = true;
        $scope.user = {};
        $scope.login = function() {
            Auth.login({
                    email: $scope.email,
                    password: $scope.password,
                    rememberme: $scope.rememberme
                },
                function(/*res*/) {
                    $location.path('/');
                },
                function(err) {
                    $rootScope.error = 'Failed to login' + err;
                });
        };

    });
