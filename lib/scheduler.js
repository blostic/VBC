'use strict';

var mongoose = require('mongoose'),
    _        = require('lodash'),
    Q        = require('q'),
    Job      = require('./models/job'),
    Task     = require('./models/task');

/**
 * Scheduler is a class that manages tasks.
 * Its responsibility lies between front-end
 * (to which it provides API) and SlaveManager
 * which it uses to dispatch tasks.
 *
 * @example
 *     var scheduler = new Scheduler({
 *         jobTypes : jobTypes,
 *         slaveManager : slaveManager
 *     });
 *     scheduler.init()
 *     .then(...);
 *
 * @class Scheduler
 * @constructor
 */
var Scheduler = function (config) {
    _.extend(this, config);
};

Scheduler.prototype = {
    /**
     * Enqueues tasks of jobs which were left incomplete
     * after shutdown.
     *
     * @method init
     * @return {Promise} resolves on having enqueued all leftover jobs
     */
    init : function () {
        var self = this,
            deferred = Q.defer();

        // deactivate init after single execution
        this.init = function () {
            var deferred = Q.defer();
            deferred.reject(new Error("Cannot init Scheduler more than once"));
            return deferred.promise;
        };

        // get all not completed jobs
        Job.findQ({ status : "executing" })
        .then(function (jobs) {
            var promises = [];

            for (var i = 0; i < jobs.length; i++) {
                // enqueue them
                promises.push(self.enqueueJob(jobs[i].id));
            }

            return Q.all(promises);
        })
        .then(function (enqueued) {
            deferred.resolve();
        })
        .fail(function (err) {
            deferred.reject(err);
        })
        .done();

        return deferred.promise;
    },

    /**
     * Creates a new Job.
     *
     * @method createJob
     * @param jobType {String} job type
     * @param data {Object} any data to be passed to the job
     * @param owner {Mongoose.Types.ObjectID} owner of the job from User
     * @return {Promise} resolves with a new job object
     */
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

        // persist
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

    /**
     * Splits a newly created job into tasks.
     *
     * @method splitJob
     * @param jobId {Mongoose.Types.ObjectID} job id
     * @param parts {Number} number of chunks data job should be split into
     * @return {Promise} resolves with task list
     */
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
            // use splitter of the type to split it
                dataSplit = type.splitter(job.data, parts),
            // serialize to send over the wire
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

    /**
     * Takes a task already split into tasks
     * and enqueues it into SlaveManager.
     *
     * @param jobId {Mongoose.Types.ObjectID} job id
     * @return {Promise} resolves after enqueuing with promise for
     *                   the result
     */
    enqueueJob : function (jobId) {
        var deferred = Q.defer(),
            self     = this;

        Job.findByIdQ(jobId)
        .then(function (job) {
            if (job === null) {
                throw new Error("Job with ID '"+jobId+"' wasn't found in db");
            }

            if (job.status !== "prepared" && job.status !== "executing") {
                throw new Error("Job must have status prepared to be able to enqueue it");
            }

            job.status = "executing";

            return job.saveQ();
        })
        .then(function (job) {
            // only new as we might be resuming
            return Task.findQ({ job : jobId, status : 'new' });
        })
        .then(function (tasks) {
            return Q.all(_.map(tasks, function (task) {
                task.status = "executing";
                return task.saveQ();
            }));
        })
        .then(function (tasks) {
            // only executing because we can have some completed left over
            // from other time
            return Task.findQ({ job : jobId, status : 'executing'});
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

    /**
     * Accepts a promise for tasks' execution
     * and updates their status and results
     * accordingly.
     *
     * @param jobId {Mongoose.Types.ObjectID} job id
     * @param promise {Promise} a promise for tasks' results
     * @return {Promise} resolves with the result
     */
    trackProgress : function (jobId, promise) {
        // it will be executed while some progress
        // has been done
        function updateTasks(tasks) {
            var promises = [];
            _.forEach(tasks, function (task) {
                // get a promise for persistance
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
        // listen on progress event as well
        .then(updateTasks, null, updateTasks)
        .then(function () {
            return [Job.findByIdQ(jobId), Task.findQ({ job : jobId })];
        })
        .spread(function (job, tasks) {
            // reduce with the matching reducer
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

    /**
     * Removes job from system.
     *
     * @param jobId {Mongoose.Types.ObjectID} job id
     * @return {Promise} resolves on having deleted the job
     */
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
            // dequeue all executing tasks
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
