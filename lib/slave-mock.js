'use strict';

SlaveMock = {
    calculate : function (code, data, taskid) {
        return [code(data), taskid];
    }
};

// usage: SlaveMock.calculate(function (number) {return number*number;}, 10, 123)

module.exports = SlaveMock;
