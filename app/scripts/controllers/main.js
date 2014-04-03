'use strict';

angular.module('vcApp')
    .controller('MainCtrl', function($scope, Auth) {
        $scope.user = Auth.user;
    });
