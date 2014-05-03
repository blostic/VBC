/**
 * Created by piotr on 03.05.14.
 */

var io = require('socket.io').listen(44444);

describe('Check server-client', function() {
    it('Sending task, receiving result', function (done) {
        io.sockets.on('connection', function (socket) {
            var multiplication = function (data) {
                var i = data.a * data.b;
                return i;
            };
            var inputData = {"id": 0, "function": multiplication.toString(), data: {"a": 5, "b": 1}};
            socket.emit('new-task', inputData);
            socket.on('result', function (data) {
                console.log("Result JSON: " + JSON.stringify(data));
                done();
            });
        });
    });
});