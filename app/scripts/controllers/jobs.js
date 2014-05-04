'use strict';

angular.module('vcApp')
    .controller('JobsCtrl', function($scope, Auth, AddJob) {
        $scope.user = Auth.user;
        $scope.updateJobs = function (){
            Auth.showJobs(function(res) {
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
                $scope.errors = { message: err };
            });
        };
        $scope.startJob = function(job) {
            console.log($scope.tasksCount);
            AddJob.startJob({
                    job: job
                },
                function(res) {
                    $scope.updateJobs();
                },
                function(err) {
                    console.log(err);
                    job.errors = { message: err };
                });
        };

        $scope.updateJobs();
    });
