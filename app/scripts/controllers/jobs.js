'use strict';

angular.module('vcApp')
    .controller('JobsCtrl', function($scope, $interval, Auth, AddJob) {
        $scope.user = Auth.user;
        $scope.functions = ['sum', 'count-primary'];
        $scope.selectedFunction = 'sum';
        $scope.start = 0;
        $scope.stop = 10;
        $scope.count = 1;
        $scope.jobs = [];

        $scope.addJob = function() {
            $scope.data = {
                start: $scope.start,
                stop: $scope.stop
            };
            console.log($scope.data);
            AddJob.addJob({
                    type: $scope.selectedFunction,
                    data: $scope.data,
                    count: $scope.count
                },
                function(res) {
                    $scope.updateJobs();
                    $scope.startJob(res.job, $scope.count);
                    $location.path('/jobs');
                    $scope.selectedFunction = undefined;
                },
                function(err) {
                    console.log(err);
                    $scope.errors = { message: err };
                });
        };

        $scope.startJob = function(job_id, count) {
            console.log(count);
            AddJob.splitJob({
                    job_id: job_id,
                    count: count
                },
                function(res) {
                    console.log(res);
                },
                function(err) {
                    console.log(err);
                    job.errors = { message: err };
                });
        };


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

        $scope.isEmpty = function (obj) {
            return angular.equals([],obj);
        };

        $interval((function(){
            for (var job in $scope.jobs) {
                $scope.updateProgress($scope.jobs[job]);
            }
        })(), 5000);

        $scope.updateJobs();
    });
