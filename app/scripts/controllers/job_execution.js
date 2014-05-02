'use strict';

angular.module('vcApp')
    .controller('SlaveCtrl', function($scope, Slave) {
        $scope.test = "test text";
        $(document).ready(function() {
            if(!("WebSocket" in window)){
                $('#chatLog, input, button, #examples').fadeOut("fast");
                $('<p>Oh no, you need a browser that supports WebSockets. ' +
                    'How about <a href="http://www.google.com/chrome">Google Chrome</a>?</p>').appendTo('#container');
            }else {
                var socket = io.connect('http://localhost:44444');
                socket.on('new-task', function (data) {
                    console.log(JSON.stringify(data));
                    socket.emit('result', Slave.execute_task(data));
                });
            }
        });
    });