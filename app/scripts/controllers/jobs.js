'use strict';

angular.module('vcApp')
    .controller('JobsCtrl', function($scope, Auth) {
        $scope.user = Auth.user;
        $scope.test = "Test";
        Auth.show_jobs(function(res) {
            $scope.jobs = res.usr.jobs;
        }, function(err) {
            alert("Fail");

        });
    });
