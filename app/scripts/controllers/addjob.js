'use strict';

angular.module('vcApp')
    .controller('AddJobCtrl', function($rootScope, $scope, AddJob, $location) {
        $scope.addJob = function(form) {
            var isArray = false;
            try {
                isArray = $.isArray(JSON.parse($scope.data));
            } catch (e) {}

            if (isArray) {
                AddJob.addJob({
                    job: 0,
                    data: $scope.data
                },
                function(/*res*/) {
                    // TODO: check HTTP code?
                    $location.path('/jobs');
                },
                function(err) {
                    $scope.errors = { message: err };
                });
            } else {
                $scope.errors = { message: 'The data must be a valid JSON array!' };
            }
        };
    });
