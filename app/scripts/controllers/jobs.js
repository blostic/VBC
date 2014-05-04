'use strict';

angular.module('vcApp')
    .controller('JobsCtrl', function($scope, Auth, AddJob) {
        $scope.user = Auth.user;
        $scope.updateJobs = function (){
            Auth.showJobs(function(res) {
                var jobs = res.jobs;
                for (var job in jobs) {
                    jobs[job].progress = "Check";
                }
                $scope.jobs = jobs;

            }, function(err) {
                $scope.errors = { message: err };
            });
        };
        $scope.updateProgress = function (job){
            AddJob.getJobInfo({
                    job_id: job.id
                },
                function(_job) {
                   job.progress = _job.finishedTasks + "/" + _job.totalTasks;
                   job.status = _job.status;
                },
                function(err) {
                    console.log(err);
                    job.errors = { message: err };
                });
        };
        $scope.startJob = function(job) {
            console.log($scope.tasksCount);
            AddJob.splitJob({
                    job_id: job.id
                },
                function(res) {
                    AddJob.startJob({
                            job_id: job.id
                        },
                        function(res) {
                            $scope.updateJobs();
                        },
                        function(err) {
                            console.log(err);
                            job.errors = { message: err };
                        });
                },
                function(err) {
                    console.log(err);
                    job.errors = { message: err };
                });
        };

        $scope.updateJobs();
    });
