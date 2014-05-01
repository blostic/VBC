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

    splitJob : function (jobId) {
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
                dataSplit = type.splitter(job.data),
                code = type.solver.toString();

            for (var i = 0; i < dataSplit.length; i++) {
                tasks.push(new Task({
                    status : "new",
                    data   : dataSplit[i],
                    code   : code,
                    job    : job.id
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
            self     = this,
            reducer;

        Job.findByIdQ(jobId)
        .then(function (job) {
            if (job === null) {
                throw new Error("Job with ID '"+jobId+"' wasn't found in db");
            }

            if (job.status !== "prepared") {
                throw new Error("Job must have status prepared to be able to enqueue it");
            }

            reducer = self.jobTypes[job.type].reducer;

            job.status = "executing";

            return job.saveQ();
        })
        .then(function (job) {
            return Task.findQ({ job : job.id});
        })
        .then(function (tasks) {
            return self.slaveManager.enqueue(_.map(tasks, function (task) {
                return task.toObject();
            }));
        })
        .then(function (tasks) {
            var promises = [];
            // lets update all the tasks which have finished calculating
            _.forEach(tasks, function (task) {
                var promise = Task.findByIdQ(task.id)
                .then(function (taskDB) {
                    if (taskDB === null) {
                        throw new Error("Cannot find task with ID: '"+task.id+"'");
                    }
                    taskDB.partial_result = task.partial_result;
                    taskDB.status = task.status;
                    return taskDB.saveQ();
                });

                promises.push(promise);
            });

            return Q.all(promises);
        }, null, function (tasks) {
            _.forEach(tasks, function (task) {
                Task.findByIdQ(task.id)
                .then(function (taskDB) {
                    taskDB.partial_result = task.partial_result;
                    taskDB.status = task.status;
                    return taskDB.saveQ();
                })
                .then(function () {})
                .done();
            });

            deferred.notify(tasks);
        })
        .then(function () {
            return Task.findQ({ job : jobId });
        })
        .then(function (tasks) {
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
                return task.id;
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

var Scheduler1 = {};
Scheduler1.prototype = {
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

                job.save(function (err, job) {
                    fn(err, job);
                });
            });
        });
    }
};

module.exports = Scheduler;
