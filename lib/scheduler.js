'use strict';

var _        = require('lodash'),
    mongoose = require('mongoose'),
    Models   = require('./models/job');

var Scheduler = function () {
    this.calculations = {};
};

Scheduler.prototype = {
    createJob : function (data, fn) {
        var self = this,
            job  = new Models.Job({
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
            task = new Models.Task({
                status : "new",
                data : job.data
            });

        job.tasks.push(task);
        job.status = "prepared";
        job.save(function (err, job) {
            fn(err, job);
        });
    },

    enqueueJob : function (job, fn) {
        var count = 0,
            jobId = job.id;

        for (var i = 0; i < job.tasks.length; i++) {
            this.enqueue(job, i, function (err, job) {
                if (err) {
                    fn(err, job);
                }

                count++;

                if (count === job.tasks.length) {
                    job.status = "executing";
                    job.save(function (err, job) {
                        fn(err, job);
                    });
                }
            });

        }
    },

    enqueue : function (job, taskIt, fn) {
        var self  = this,
            jobId = job.id;

        if (!this.calculations.hasOwnProperty(jobId)) {
            this.calculations[jobId] = 0;
        }

        job.tasks[taskIt].status = "executing";

        job.save(function (err, job) {
            fn(err, job);

            _.defer(function () {
                Models.Job.findById(jobId, function (err, job) {
                    var data = job.tasks[taskIt].data,
                    // TODO: this part should be executed on a slave
                        result = self.solver(data);

                    job.tasks[taskIt].partial_result = result;
                    job.tasks[taskIt].status = "completed";

                    job.save(function (err, job) {
                        self.calculations[jobId]++;

                        if (self.calculations[jobId] === job.tasks.length) {
                            self.reduce(jobId);
                        }
                    });
                });
            });
        });
    },

    reduce : function (jobId, fn) {
        var self = this;
        fn = fn || function () {};

        Models.Job.findById(jobId, function (err, job) {
            var result = self.reducer(job);
            job.result = result;
            job.status = "completed";

            job.save(function (err, job) {
                fn(err, job);
            });
        });
    }
};

module.exports = Scheduler;
