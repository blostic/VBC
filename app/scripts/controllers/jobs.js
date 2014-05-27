'use strict';

angular.module('vcApp')
    .controller('JobsCtrl', function($scope, $interval, Auth, AddJob) {
        $scope.user = Auth.user;
        $scope.updateJobs = function (){
            Auth.showJobs(function(res) {
                var jobs = res.jobs;
                for (var job in jobs) {
                    $interval((function (job) {
                        console.log(job);
                        return function () {
                            $scope.updateProgress(job);
                        };
                    })(jobs[job]), 1000);
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
                   job.status = _job.status;
                   job.result = _job.result;
                   job.progress = _job.progress;
                   console.log(_job);
                },
                function(err) {
                    console.log(err);
                    job.errors = { message: err };
                });
        };
        $scope.startJob = function(job) {
            console.log(job.tasksCount);
            AddJob.splitJob({
                    job_id: job.id,
                    count: job.tasksCount
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
