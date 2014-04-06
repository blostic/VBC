'use strict';

angular.module('vcApp')
    .controller('JobsCtrl', function($scope, Auth) {
        //$scope.code = highlight.highlightAuto("javascript", "function(a){ var x = 1; for (var i = 1; i < 5; i++) { x = x * i; } return x; }").value;
        $scope.user = Auth.user;
        Auth.show_jobs(function(res) {
            var jobs = res.jobs;
            for (var job in jobs) {
                var finished = 0;
                var allTasks = 0;
                var tasks = jobs[job].tasks;
                for (var task in tasks) {
                    if (tasks[task].status == "finished") {
                        finished++;
                    }
                    allTasks++;
                }
                jobs[job].allTasks = allTasks;
                jobs[job].finished = finished;
            }
            $scope.jobs = jobs;

        }, function(err) {
            alert("Fail");

        });
    });
