'use strict';

var SlaveManager = function () { };
SlaveManager.prototype = {
    enqueue : function (tasks) {
        // tasks is an array of tasks mapped with toObject
        // to remove mongoose boilerplate and leave properties only

        // it should return a promise which
        // if a single task completes should emit process([ task ])
        // if all tasks complete should emit resolve([ task1, task2, ... ])
        // resolve doesn't have to send info about tasks already signalled
        // to be finished by 'process'
    },
    dequeue : function (taskIds) {
        // should return a promise
        // if it is immediately ready it should resolve it rightaway
        // if task doesn't exist or something went wrong it would be appropriate
        // to reject it with some info
    }
};

module.exports = SlaveManager;
