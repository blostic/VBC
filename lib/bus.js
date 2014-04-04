'use strict';
var EventEmitter = require('events').EventEmitter;

var buses = {};

var Bus = {
    clean : function (name) {
        if (name !== undefined) {
            delete buses[name];
            return;
        }

        buses = {};
    },

    get : function (name) {
        var bus = buses[name];

        if (bus === undefined) {
            bus = new EventEmitter();
            buses[name] = bus;
        }

        return bus;
    },

    has : function (name) {
        return buses[name] !== undefined;
    }
};

module.exports = Bus;
