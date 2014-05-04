'use strict';

angular.module('vcApp')
    .controller('AddJobCtrl', function($rootScope, $scope, AddJob, $location) {
        $scope.functions = ['sum', 'count-primary'];
        $scope.selectedFunction = undefined;
        $scope.beginning = 3;
        $scope.ending = 0;

        $scope.addJob = function() {
            $scope.data = [$scope.beginning, $scope.ending];
            console.log($scope.data);
            AddJob.addJob({
                job: $scope.selectedFunction,
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
