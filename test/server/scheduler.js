'use strict';

var _         = require('lodash'),
    Scheduler = require('../../lib/scheduler'),
    Models    = require('../../lib/models/job');

describe('Scheduler', function () {
    var scheduler;

    var cleanCollections = function (done) {
        Models.Job.remove({}, function () {
            Models.Task.remove({}, function () {
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
        var data = { left: 0, right: 10 };

        scheduler.createJob(data, function (err, job) {
            job.status.should.be.equal("new");
            job.data.should.eql(data);
            done();
        });
    });

    it('should split job if splitJob(...) called', function (done) {
        var job = new Models.Job({
            data : {},
            status : "new"
        });
        scheduler.splitJob(job, function (err, job) {
            job.status.should.be.equal("prepared");
            job.tasks.length.should.be.equal(1);
            job.tasks[0].status.should.equal("new");
            done();
        });
    });

    it('should enqueue tasks to slaves', function (done) {
        var data = {},
            tasks = [new Models.Task({
                status : "new",
                data : data
            })],
            job = new Models.Job({
                data : data,
                status : "prepared",
                tasks : tasks
            });
        scheduler.solver = function () {
            return 42;
        };
        scheduler.reducer = function (job) {
            return job.tasks[0].partialResult;
        };
        job.save(function (err, job) {
            scheduler.enqueueJob(job, function (err, job) {
                job.tasks[0].status.should.equal("executing");
                job.status.should.equal("executing");
                _.delay(function () {
                    Models.Job.findById(job.id, function (err, job) {
                        job.tasks[0].status.should.equal("completed");
                        job.result.should.equal(42);
                        job.status.should.equal("completed");
                        done();
                    });
                }, 10);
            });
        });
    });
});
