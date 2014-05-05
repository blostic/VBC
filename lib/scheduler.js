'use strict';

var mongoose = require('mongoose'),
    _        = require('lodash'),
    Q        = require('q'),
    Job      = require('./models/job'),
    Task     = require('./models/task'),
    slave    = require('./slave-mock.js');

var Scheduler = function (config) {
    _.extend(this, config);
};

Scheduler.prototype = {
    createJob : function (jobType, data, owner) {
        var deferred = Q.defer();

        if (!(jobType && data && owner)) {
            throw new Error("Illegal arguments passed");
        }

        if (!this.jobTypes.hasOwnProperty(jobType)) {
            deferred.reject(new Error("Job type '"+jobType+"' is not available"));
            return deferred.promise;
        }

        var job = new Job({
            status : "new",
            data : data,
            type : jobType,
            owner : owner
        });

        job.saveQ()
        .then(function (job) {
            deferred.resolve(job);
        })
        .fail(function (err) {
            deferred.reject(err);
        })
        .done();

        return deferred.promise;
    },

    splitJob : function (jobId, parts) {
        var job,
            tasks = [],
            deferred = Q.defer(),
            self = this;

        Job.findByIdQ(jobId)
        .then(function (_job) {
            job = _job;

            if (!job) {
                throw new Error("Job with ID '"+jobId+"' wasn't found in db");
            }

            if (job.status !== "new") {
                throw new Error("Job must be new to split it");
            }

            if (!self.jobTypes.hasOwnProperty(job.type)) {
                throw new Error("Job type '"+job.type+"' is not available");
            }

            var type = self.jobTypes[job.type],
                dataSplit = type.splitter(job.data, parts),
                code = type.solver.toString();

            for (var i = 0; i < dataSplit.length; i++) {
                tasks.push(new Task({
                    status : "new",
                    data   : dataSplit[i],
                    code   : code,
                    job    : job._id
                }));
            }

            job.status = "prepared";
            return job.saveQ();
        })
        .then(function (_job) {
            job = _job;

            return Task.createQ(tasks);
        })
        .then(function () {
            deferred.resolve(tasks);
        })
        .fail(function (err) {
            deferred.reject(err);
        })
        .done();

        return deferred.promise;
    },

    enqueueJob : function (jobId) {
        var deferred = Q.defer(),
            self     = this;

        Job.findByIdQ(jobId)
        .then(function (job) {
            if (job === null) {
                throw new Error("Job with ID '"+jobId+"' wasn't found in db");
            }

            if (job.status !== "prepared") {
                throw new Error("Job must have status prepared to be able to enqueue it");
            }

            job.status = "executing";

            return job.saveQ();
        })
        .then(function (job) {
            return Task.findQ({ job : job._id});
        })
        .then(function (tasks) {
            var promise = self.slaveManager.enqueue(_.map(tasks, function (task) {
                return task.toObject();
            }));

            promise = self.trackProgress(jobId, promise);

            deferred.resolve(promise);
        })
        .fail(function (err) {
            deferred.reject(err);
        })
        .done();

        return deferred.promise;
    },

    trackProgress : function (jobId, promise) {
        function updateTasks(tasks) {
            var promises = [];
            _.forEach(tasks, function (task) {
                var promise = Task.findByIdQ(task._id)
                .then(function (taskDB) {
                    if (taskDB === null) {
                        throw new Error("Cannot find task with ID: '"+task._id+"'");
                    }
                    taskDB.partial_result = task.partial_result;
                    taskDB.status = task.status;
                    return taskDB.saveQ();
                }).fail(function(task){
//                        console.log("Error");
                    });

                promises.push(promise);
            });

            return Q.all(promises);
        }

        var self = this,
            deferred = Q.defer();

        promise
        .then(updateTasks, null, updateTasks)
        .then(function () {
            return [Job.findByIdQ(jobId), Task.findQ({ job : jobId })];
        })
        .spread(function (job, tasks) {
            var reducer = self.jobTypes[job.type].reducer;

            return [ reducer(tasks), Job.findByIdQ(jobId) ];
        })
        .spread(function (result, job) {
            job.status = "completed";
            job.result = result;
            return job.saveQ();
        })
        .then(function (job) {
            deferred.resolve(job.result);
        })
        .fail(function (err) {
            deferred.reject(err);
        })
        .done();

        return deferred.promise;
    },

    removeJob : function (jobId) {
        var self     = this,
            deferred = Q.defer();

        Job.findByIdQ(jobId)
        .then(function (job) {

            if (job === null) {
                throw new Error("Job with ID '"+jobId+"' wasn't found in db");
            }

            return job.removeQ();
        })
        .then(function () {
            return Task.findQ({ job : jobId });
        })
        .then(function (tasks) {
            var executing = _.chain(tasks)
            .filter(function (task) {
                return task.status === "executing";
            })
            .map(function (task) {
                return task._id;
            })
            .value();

            if (executing.length > 0) {
                return self.slaveManager.dequeue(executing);
            } else {
                return;
            }
        })
        .then(function () {
            return Task.removeQ({ job : jobId });
        })
        .then(function () {
            deferred.resolve();
        })
        .fail(function (err) {
            deferred.reject(err);
        })
        .done();

        return deferred.promise;
    }
};

module.exports = Scheduler;
