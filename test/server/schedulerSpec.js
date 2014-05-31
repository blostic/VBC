'use strict';

var _         = require('lodash'),
    should    = require('should'),
    Q         = require('q'),
    mongoose  = require('mongoose-q')(require('mongoose')),
    ObjectId  = mongoose.Types.ObjectId,
    Scheduler = require('../../lib/scheduler'),
    Job       = require('../../lib/models/job'),
    Task      = require('../../lib/models/task');

Q.longStackSupport = true;

describe('Scheduler', function () {
    var scheduler,
        slaveManager,
        fail = function (msg) { throw new Error(msg); },
        job_types = {
            testowy : {
                solver : function (data) {
                    var s = 0,
                        i = data.a;

                    while (i !== data.b) {
                        s += i;
                        i++;
                    }

                    return s + i;
                },
                reducer : function (tasks) {
                    return _.reduce(tasks, function (memo, task) {
                        return memo + task.partial_result;
                    }, 0);
                },
                splitter : function (data) {
                    var b = Math.floor((data.a + data.b)/2),
                        a = b + 1;
                    return [{
                        a : data.a,
                        b : b
                    },{
                        a : a,
                        b : data.b
                    }];
                }
            }
        };

    var SlaveManager = function () { };
    SlaveManager.prototype = {
        enqueue : function () {},
        dequeue : function () {}
    };

    var cleanCollections = function (done) {
        Job.remove({}, function () {
            Task.remove({}, function () {
                done();
            });
        });
    };

    beforeEach(function (done) {
        cleanCollections(function () {
            slaveManager = new SlaveManager();
            scheduler = new Scheduler({
                jobTypes : job_types,
                slaveManager : slaveManager
            });
            scheduler.init();
            done();
        });
    });

    describe('#init', function () {
        it('should attempt to resume executing jobs', function (done) {
            var enqueueCalled = 0,
                scheduler = new Scheduler({
                    jobTypes : job_types,
                    slaveManager : slaveManager
                });

            slaveManager.enqueue = function (tasks) {
                tasks.length.should.equal(1);
                tasks[0]._id.should.eql(task1._id);
                enqueueCalled++;
                return {};
            };

            scheduler.trackProgress = function () {};

            var job = new Job({
                    status : "executing",
                    data   : { a : 0, b : 10 },
                    type : "testowy"
                }),
                task1 = new Task({
                    status : "executing",
                    job    : job.id
                }),
                task2 = new Task({
                    status : "completed",
                    job    : job.id
                });

            Q.all([ job.saveQ(), task1.saveQ(), task2.saveQ() ])
            .then(function () {
                return scheduler.init();
            })
            .then(function () {
                enqueueCalled.should.equal(1);
                done();
            })
            .done();
        });
    });

    describe('#createJob', function () {
        it('should create new job', function (done) {
            var data    = { a : 0, b : 10 },
                userId  = new ObjectId(),
                jobType = "testowy",
                jobId;

            scheduler.createJob(jobType, data, userId)
            .then(function (job) {
                job.status.should.be.equal("new");
                job.data.should.eql(data);
                job.owner.should.eql(userId);
                job.type.should.eql(jobType);

                jobId = job.id;
                return Job.findByIdQ(job.id);
            })
            .then(function (job) {
                job.id.should.eql(jobId);
                done();
            })
            .done();
        });

        it('should fail if job type doesn\'t exist', function (done) {
            var data    = { a : 0, b : 10 },
                userId  = new ObjectId(),
                jobType = "testwy";

            scheduler.createJob(jobType, data, userId)
            .then(fail)
            .fail(function () { done(); })
            .done();
        });
    });

    describe('#splitJobs', function () {
        it('should split job', function (done) {
            var job = new Job({
                status : "new",
                data   : { a : 0, b : 10 },
                type : "testowy"
            });

            job.saveQ()
            .then(function (job) {
                return scheduler.splitJob(job.id);
            })
            .then(function (tasks) {
                tasks.length.should.equal(2);
                return Task.findQ({ job : job.id });
            })
            .then(function (tasks) {
                tasks.length.should.equal(2);
                tasks[0].data.should.eql({a : 0, b : 5});
                tasks[1].data.should.eql({a : 6, b : 10});
                tasks[0].status.should.equal("new");
                done();
            })
            .done();

        });

        it('should fail if no job found', function (done) {
            scheduler.splitJob(new ObjectId())
            .fail(function () { done(); })
            .done();
        });

        it('should fail if job has wrong state', function (done) {
            var job = new Job({
                status : "prepared",
                data   : { a : 0, b : 10 },
                type : "testowy"
            });

            job.saveQ()
            .then(function (job) {
                return scheduler.splitJob(job.id);
            }, fail)
            .then(fail)
            .fail(function () { done(); })
            .done();
        });

        it('should fail if job type isn\'t found', function (done) {
            var job = new Job({
                status : "new",
                data   : { a : 0, b : 10 },
                type : "bad"
            });

            job.saveQ()
            .then(function (job) {
                return scheduler.splitJob(job.id);
            })
            .then(fail)
            .fail(function () { done(); })
            .done();
        });
    });

    describe('#enqueueJob', function () {
        it('should call enqueue and return its promise by promise', function (done) {
            var trackProgressCalled = 0,
                enqueueReturn = {},
                trackProgressPromise = {};

            slaveManager.enqueue = function (tasks) {
                tasks.length.should.equal(2);
                tasks[0].should.not.have.property("save");
                return enqueueReturn;
            };

            scheduler.trackProgress = function (jobId, promise) {
                trackProgressCalled++;

                jobId.should.eql(job.id);

                promise.should.equal(enqueueReturn);

                return trackProgressPromise;
            };

            var job = new Job({
                    data : {},
                    status : "prepared",
                    type : "testowy"
                }),
                task1 = new Task({
                    status : "new",
                    job    : job.id
                }),
                task2 = new Task({
                    status : "new",
                    job    : job.id
                });

            job.saveQ()
            .then(function () {
                return task1.saveQ();
            })
            .then(function () {
                return task2.saveQ();
            })
            .then(function () {
                return scheduler.enqueueJob(job.id);
            })
            .then(function (resultPromise) {
                resultPromise.should.equal(trackProgressPromise);

                return Job.findByIdQ(job.id);
            })
            .then(function (job) {
                trackProgressCalled.should.equal(1);

                job.status.should.equal("executing");

                done();
            })
            .done();
        });

        it('should fail if invalid status', function (done) {
            var job = new Job({
                status : "executing",
                type : "testowy"
            });

            job.saveQ()
            .then(function () {
                return scheduler.enqueueJob(job.id);
            })
            .then(fail)
            .fail(function () { done(); })
            .done();
        });

        it('should fail if job not found', function (done) {
            scheduler.enqueueJob(new ObjectId())
            .then(fail)
            .fail(function () { done(); })
            .done();
        });
    });

    describe('#trackProgress', function () {
        it('should update task status', function (done) {
            var deferred = Q.defer(),
                jobId = new ObjectId();

            var task1 = new Task({
                    status : "executing",
                    job    : jobId
                }),
                task2 = new Task({
                    status : "executing",
                    job    : jobId
                });

            Q.all([task1.saveQ(), task2.saveQ()])
            .then(function () {
                var promise = scheduler.trackProgress(jobId, deferred.promise);

                promise.should.have.property('then');
                promise.should.have.property('fail');

                task1.status = "completed";
                task1.partial_result = 42;

                deferred.notify([task1]);

                _.delay(function () {
                    Task.findByIdQ(task1.id)
                    .then(function (task) {
                        task.status.should.equal(task1.status);
                        task.partial_result.should.equal(task1.partial_result);
                        done();
                    })
                    .done();
                }, 50);
            })
            .done();
        });

        it('should resolve after completion of all', function (done) {
            var job = new Job({
                    status : "executing",
                    type   : "testowy"
                }),
                task = new Task({
                    status : "executing",
                    job    : job.id
                }),
                deferred = Q.defer();

            Q.all([job.saveQ(), task.saveQ()])
            .then(function () {

                scheduler.trackProgress(job.id, deferred.promise)
                .then(function (result) {
                    result.should.equal(42);

                    return Q.all([Job.findByIdQ(job.id), Task.findByIdQ(task.id)]);
                })
                .spread(function (job, task) {
                    job.status.should.equal("completed");
                    job.result.should.equal(42);

                    task.status.should.equal("completed");
                    task.partial_result.should.equal(42);

                    done();
                })
                .done();

                task.status = "completed";
                task.partial_result = 42;

                deferred.resolve([task]);
            })
            .done();
        });
    });

    describe('#removeJob', function () {
        it('should remove new job', function (done) {
            var job = new Job({
                status : "new"
            });

            job.saveQ()
            .then(function (job) {
                return scheduler.removeJob(job.id);
            })
            .then(function () {
                return Job.findByIdQ(job.id);
            })
            .then(function (job) {
                should.not.exist(job);
                done();
            })
            .done();
        });

        it('should fail if job not found', function (done) {
            scheduler.removeJob(new ObjectId())
            .then(fail)
            .fail(function () { done(); })
            .done();
        });

        it('should remove split tasks', function (done) {
            var job = new Job({
                    status : "prepared"
                }),
                task = new Task({
                    job : job.id
                });

            job.saveQ()
            .then(function () {
                return task.saveQ();
            })
            .then(function () {
                return scheduler.removeJob(job.id);
            })
            .then(function () {
                return Task.findByIdQ(task.id);
            })
            .then(function (task) {
                should.not.exist(task);
                done();
            })
            .done();
        });

        it('should cancel executing tasks', function (done) {
            var job = new Job({
                    status : "executing"
                }),
                task = new Task({
                    job    : job.id,
                    status : "executing"
                }),
                dequeueCalled = 0;

            slaveManager.dequeue = function (tasks) {
                tasks.length.should.equal(1);
                tasks[0].toString().should.eql(task.id);
                dequeueCalled++;
            };

            job.saveQ()
            .then(function () {
                return task.saveQ();
            })
            .then(function () {
                return scheduler.removeJob(job.id);
            })
            .then(function () {
                dequeueCalled.should.equal(1);
                done();
            })
            .done();
        });
    });
});
