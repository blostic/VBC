'use strict';

angular.module('vcApp')
    .controller('AddJobCtrl', function($rootScope, $scope, AddJob, $location) {
        $scope.functions = ['sum', 'count-primary'];
        $scope.selectedFunction = undefined;
        $scope.start = 0;
        $scope.stop = 10;

        $scope.addJob = function() {
            $scope.data = {
                start: $scope.start,
                stop: $scope.stop
            };
            console.log($scope.data);
            AddJob.addJob({
                type: $scope.selectedFunction,
                data: $scope.data
            },
            function(/*res*/) {
                $location.path('/jobs');
            },
            function(err) {
                console.log(err);
                $scope.errors = { message: err };
            });
        };
    });
