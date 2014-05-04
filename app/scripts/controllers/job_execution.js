'use strict';

angular.module('vcApp')
    .controller('SlaveCtrl', function($scope, Slave) {
        $scope.test = "test text";
        $(document).ready(function() {
            if(!("WebSocket" in window)){
                    alert("Update your browser");
            }else {
                var socket = io.connect('http://localhost:9001');
                socket.on('task_request', function (data) {
                    console.log(JSON.stringify(data));
                    socket.emit('task_reply', Slave.execute_task(data));
                });
            }
        });
    });