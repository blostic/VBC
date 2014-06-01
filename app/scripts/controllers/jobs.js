'use strict';

angular.module('vcApp')
    .controller('JobsCtrl', function($scope, Auth, AddJob, $timeout) {
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
                    $scope.startJob(res.job, $scope.count);
                    $scope.updateJobs();
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
                    AddJob.startJob({
                            job_id: job_id
                        },
                        function(res) {
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
                    job.status = _job.status;
                    job.result = _job.result;
                },
                function(err) {
                    console.log(err);
                    job.errors = { message: err };
                });
        };

        $scope.isEmpty = function (obj) {
            return angular.equals([],obj);
        };

        setInterval(
            function(){
                for (var job in $scope.jobs) {
                    $scope.updateProgress($scope.jobs[job]);
               }
            }, 5000);

        $scope.updateJobs();
    });
