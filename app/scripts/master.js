var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({ port: 4422 });

function getPi() {
    var Pi = 0;
    var n = 1;
    for (var i = 0; i <= 1000; i++)
    {
        Pi = Pi+(4/n);
        n = n+2;
        Pi = Pi-(4/n);
        n = n+2;
    }

    return Pi;
}

wss.on('connection', function(ws) {
    ws.on('message', function(msg) {
        console.log('recv: %s', msg);
    });

    ws.send('(' + getPi.toString() + ')() * 2');
});

