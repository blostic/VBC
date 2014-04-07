'use strict';

var _ = require('lodash');

var SlaveMock = {
    calculate : function (scheduler, code, data, taskId) {
        _.defer(function () {
            console.log('executing:\n' + code + '\n with data: ' + data);
            // TODO: fix this
            var funcStatements = code.substring(code.indexOf("{") + 1, code.lastIndexOf("}"));
            var func = Function('range', funcStatements);
            var result = func(data);
            console.log('result = ' + result);
            scheduler.saveResult(taskId, result);
        });
    }
};

// usage: SlaveMock.calculate(function (number) {return number*number;}, 10, 123)

module.exports = SlaveMock;
