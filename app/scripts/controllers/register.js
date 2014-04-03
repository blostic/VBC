'use strict';

angular.module('vcApp')
    .controller('RegisterCtrl', function($scope, Auth, $location) {
        $scope.role = Auth.userRoles.user;
        $scope.userRoles = Auth.userRoles;

        $scope.register = function() {
            var userData = {
                name: $scope.name,
                email: $scope.email,
                password: $scope.password
            };
            console.log(userData);
            Auth.register(userData,
                function() {
                    $location.path('/');
                },
                function(err) {
                    $rootScope.error = err;
                });
        };
    });
