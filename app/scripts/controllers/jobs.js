'use strict';

angular.module('vcApp')
    .controller('JobsCtrl', function($scope, Auth, AddJob, $timeout) {
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
                    job.status = _job.status;
                    job.result = _job.result;
                },
                function(err) {
                    console.log(err);
                    job.errors = { message: err };
                });
        };

        setInterval(
            function(){
                for (var job in $scope.jobs) {
                    $scope.updateProgress($scope.jobs[job]);
               }
            }, 2000);

        $scope.updateJobs();
    });
