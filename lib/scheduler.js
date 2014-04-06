'use strict';

var mongoose = require('mongoose'),
    models   = require('./models/job');

var Scheduler = function () {

};

Scheduler.prototype = {
    createJob : function (data, fn) {
        var self = this,
            job  = new models.Job({
                data : data,
                status : "new",
                tasks : []
            });

        job.save(function (err, new_job) {
            fn(err, new_job);
        });
    },

    splitJob : function (job, fn) {
        // TODO: enhance splitting to do better in the future
        var self = this,
            task = new models.Task({
                status : "new",
                data : job.data
            });

        job.tasks.push(task);
        job.status = "prepared";
        job.save(function (err, job) {
            fn(err, job);
        });
    }
};

module.exports = Scheduler;
