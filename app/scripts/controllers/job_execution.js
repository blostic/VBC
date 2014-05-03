'use strict';

angular.module('vcApp')
    .controller('SlaveCtrl', function($scope, Slave) {
        $scope.test = "test text";
        $(document).ready(function() {
            if(!("WebSocket" in window)){
                    alert("Update your browser");
            }else {
                var socket = io.connect('http://localhost:44444');
                socket.on('new-task', function (data) {
                    console.log(JSON.stringify(data));
                    socket.emit('result', Slave.execute_task(data));
                });
            }
        });
    });