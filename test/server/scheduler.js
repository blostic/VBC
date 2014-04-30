'use strict';

var _         = require('lodash'),
    Q         = require('q'),
    mongoose  = require('mongoose-q')(require('mongoose')),
    ObjectId  = mongoose.Types.ObjectId,
    Scheduler = require('../../lib/scheduler'),
    Job       = require('../../lib/models/job'),
    Task      = require('../../lib/models/task');

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
                reducer : function (results) {
                    return _.reduce(results, function (memo, num) {
                        return memo + num;
                    });
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
            done();
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
        it('should call #enqueueTasks and #reduceTasks after completion', function (done) {
            var enqueueCount = 0;

            slaveManager.enqueue = function (tasks) {
                tasks.length.should.equal(2);
                enqueueCount++;
                var deferred = Q.defer();
                Job.findByIdQ(job.id)
                .then(function (job) {
                    job.status.should.eql('executing');
                    deferred.resolve();
                })
                .fail(fail)
                .done();
                return deferred.promise;
            };

            scheduler.reduceTasks = function () {
                return 42;
            };

            var job = new Job({
                    data : {},
                    status : "prepared",
                    job_type : "testowy"
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
            .then(function (results) {
                results.should.equal(42);
                enqueueCount.should.equal(1);
                return Job.findByIdQ(job.id);
            })
            .then(function (job) {
                job.status.should.eql('completed');
                job.result.should.equal(42);
                done();
            })
            .done();
        });

        it('should fail if invalid status', function (done) {
            var job = new Job({
                status : "executing",
                job_type : "testowy"
            });

            job.saveQ()
            .then(function () {
                return scheduler.enqueueJob(job.id);
            })
            .then(fail)
            .fail(function () { done(); })
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
                job.should.equal(null);
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
                task.should.equal(null);
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
                tasks[0].should.eql(task);
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
