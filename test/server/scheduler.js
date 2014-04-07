'use strict';

var _         = require('lodash'),
    ObjectId  = require('mongoose').Types.ObjectId,
    Scheduler = require('../../lib/scheduler'),
    Job       = require('../../lib/models/job'),
    Task      = require('../../lib/models/task');

describe('Scheduler', function () {
    var scheduler;

    var cleanCollections = function (done) {
        Job.remove({}, function () {
            Task.remove({}, function () {
                done();
            });
        });
    };

    beforeEach(function (done) {
        cleanCollections(function () {
            scheduler = new Scheduler();
            done();
        });
    });

    it('should create new job if createJob(...) called', function (done) {
        var data = { left: 0, right: 10 },
            userId = ObjectId(),
            code = 'function() { return 42; }';

        scheduler.createJob(code, data, userId, function (err, job) {
            job.status.should.be.equal("new");
            job.data.should.eql(data);
            job.owner.should.eql(userId);
            done();
        });
    });

    it('should split job if splitJob(...) called', function (done) {
        var job = new Job({
            data : {},
            status : "new"
        });

        scheduler.splitJob(job, function (err, job) {
            Task.find({ job : job.id }).exec(function (err, tasks) {
                job.status.should.be.equal("prepared");
                tasks.length.should.be.equal(1);
                tasks[0].status.should.equal("new");
                done();
            });
        });
    });

    it('should enqueue tasks to slaves', function (done) {
        var data = {},
            task = new Task({
                status : "new",
                data : data,
                code : "function(data) { return 42; }"
            }),
            job = new Job({
                data : data,
                status : "prepared",
                code : "function() { return 42; }"
            });

        scheduler.reducer = function (tasks) {
            return tasks[0].partial_result;
        };

        job.save(function (err, job) {
            task.job = job.id;
            task.save(function (err, task) {
                scheduler.enqueueJob(job, function (err, job) {
                    Task.find({ job : job.id }).exec(function (err, tasks) {
                        tasks[0].status.should.equal("executing");
                        job.status.should.equal("executing");
                        _.delay(function () {
                            Job.findById(job.id, function (err, job) {
                                Task.find({ job : job.id }).exec(function (err, tasks) {
                                    tasks[0].status.should.equal("completed");
                                    job.result.should.equal(42);
                                    job.status.should.equal("completed");
                                    done();
                                });
                            });
                        }, 50);
                    });
                });
            });
        });
    });
});
