'use strict';

angular.module('vcApp')
    .controller('HomeCtrl', function($scope, Auth) {
        $scope.user = Auth.user;
    });
