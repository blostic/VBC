'use strict';

angular.module('vcApp')
    .controller('AddJobCtrl', function($rootScope, $scope, AddJob, $location) {
        $scope.addJob = function(form) {
            AddJob.addJob({
                    job: 0,
                    data: $scope.data
                },
                function(/*res*/) {
                    $location.path('/jobs');
                },
                function(err) {
                    $scope.errors = err;
                });
        };
    });
