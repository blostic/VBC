'use strict';

angular.module('vcApp')
    .controller('AddJobCtrl', function($rootScope, $scope, Auth,  AddJob, $location) {
        $scope.functions = ['sum', 'count-primary'];
        $scope.selectedFunction = undefined;
        $scope.start = 0;
        $scope.stop = 10;
        $scope.count = 1;

        $scope.addJob = function(form) {
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
                $location.path('/jobs');
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
                        function(res) {},
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

    });
