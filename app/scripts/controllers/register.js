'use strict';

angular.module('vcApp')
    .controller('RegisterCtrl', function($rootScope, $scope, Auth, $location) {
        $scope.role = Auth.userRoles.user;
        $scope.userRoles = Auth.userRoles;
        $scope.register = function() {
            var userData = {
                name: $scope.name,
                email: $scope.email,
                password: $scope.password
            };
            Auth.register(userData,
                function() {
                    $location.path('/');
                },
                function(err) {
                    $scope.errors = err;
                });
        };
    });
