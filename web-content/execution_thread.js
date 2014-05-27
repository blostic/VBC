/**
 * Created by piotr on 04.05.14.
 */
importScripts('socket.io.js', 'task_executor.js');

var socket = io.connect('http://localhost:9001');
socket.on('task_request', function (data) {
	setTimeout(function () {
    var result = execute_task(data);
    socket.emit('task_reply', result);
}, 1000);
});
