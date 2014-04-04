'use strict';

angular.module('vcApp')
    .controller('JobsCtrl', function($scope, Auth) {
        //$scope.code = highlight.highlightAuto("javascript", "function(a){ var x = 1; for (var i = 1; i < 5; i++) { x = x * i; } return x; }").value;
        $scope.user = Auth.user;
        $scope.test = "Test";
        Auth.show_jobs(function(res) {
            $scope.jobs = res.usr.jobs;
        }, function(err) {
            alert("Fail");

        });
    });
