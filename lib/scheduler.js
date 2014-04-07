'use strict';

var mongoose = require('mongoose'),
    Job      = require('./models/job'),
    Task     = require('./models/task'),
    slave    = require('./slave-mock.js');

var Scheduler = function () {
    this.calculations = {};
};

Scheduler.prototype = {
    createJob : function (code, data, owner, fn) {
        var self = this,
            job  = new Job({
                code: code,
                data   : data,
                status : "new",
                owner  : owner
            });

        job.save(function (err, new_job) {
            fn(err, new_job);
        });
    },

    splitJob : function (job, fn) {
        // TODO: enhance splitting to do better in the future
        var self = this,
            task = new Task({
                status : "new",
                data   : job.data,
                job    : job.id,
                code   : job.code
            });

        job.status = "prepared";
        job.save(function (err, job) {
            task.save(function (err, task) {
                fn(err, job);
            });
        });
    },
enqueueJob : function (job, fn) {
        var self  = this,
            count = 0,
            jobId = job.id;

        Task.find({ job : job.id }).exec(function (err, tasks) {
            self.calculations[job.id] = tasks.length;
            for (var i = 0; i < tasks.length; i++) {
                self.enqueue(tasks[i], function (err, task) {
                    if (err) {
                        fn(err, job);
                    }

                    count++;

                    if (count === tasks.length) {
                        job.status = "executing";
                        job.save(function (err, job) {
                            fn(err, job);
                        });
                    }
                });
            }
        });
    },

    enqueue : function (task, fn) {
        var self  = this,
            jobId = task.job;

        task.status = "executing";

        task.save(function (err, task) {
            fn(err, task);
            slave.calculate(self, task.code, task.data, task.id);
        });
    },

    saveResult : function (taskId, result) {
        var self = this;

        Task.findById(taskId, function (err, task) {
            var jobId = task.job;

            console.log('partial result: ' + result);
            task.partial_result = result;
            task.status = "completed";

            task.save(function (err, job) {
                self.calculations[jobId]--;

                if (self.calculations[jobId] === 0) {
                    self.reduce(jobId);
                }
            });
        });
    },

    reduce : function (jobId, fn) {
        var self = this;
        fn = fn || function () {};

        Job.findById(jobId, function (err, job) {
            Task.find({ job : jobId }).exec(function (err, tasks) {
                var result = self.reducer(tasks);
                job.result = result;
                job.status = "completed";
                console.log('result: ' + result);

                job.save(function (err, job) {
                    fn(err, job);
                });
            });
        });
    }
};

module.exports = Scheduler;
