'use strict';

var _ = require('lodash');

var SlaveMock = {
    calculate : function (scheduler, code, data, taskId) {
        _.defer(function () {
            var func = Function('data', code);
            var result = func(data);
            scheduler.saveResult(taskId, result);
        });
    }
};

// usage: SlaveMock.calculate(function (number) {return number*number;}, 10, 123)

module.exports = SlaveMock;
