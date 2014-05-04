'use strict';

angular.module('vcApp')
    .controller('SlaveCtrl', function($scope) {
        $scope.test = "test text";
        $(document).ready(function() {
            if(!("WebSocket" in window)){
                    alert("Update your browser. You need WebSocket");
            }else {
                var worker = new Worker('/execution_thread.js');
            }
        });
    });
