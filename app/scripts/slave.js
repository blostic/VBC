'use strict';

(function() {
    function Slave(masterURL) {
        this.connectionLost = false;
        this.connect(masterURL);
    }

    Slave.prototype.onOpen = function() {
        this.connectionLost = false;

        document.write('open<br>');
    }

    Slave.prototype.onMsgReceived = function(evt) {
        document.write('received:<br>' + evt.data + '<br>');

        try {
            (function(data, socket) {
                var result = eval(data);
                socket.send(result);
                document.write('result: ' + result);
            })(evt.data, this.socket);
        } catch (err) {
            var str = 'Exception (' + err.constructor.name + '): ' + JSON.stringify(err);
            this.socket.send(str);
            document.write(str + '<br>');
        }
    }

    Slave.prototype.onClose = function() {
        if (!this.connectionLost) {
            document.write('closed, reconnecting...<br>');
        }
        this.connectionLost = true;

        this.connect(this.masterURL);
    }

    Slave.prototype.connect = function(url) {
        slave = this;

        this.masterURL = url;
        this.socket = new WebSocket(url, 'TCP');
        this.socket.onopen = function() { slave.onOpen(); }
        this.socket.onmessage = function(msg) { slave.onMsgReceived(msg); }
        this.socket.onclose = function() { slave.onClose(); }
    }

    var slave = new Slave('ws://172.16.0.108:4422');
})();
