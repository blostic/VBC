'use strict';

var Sinon     = require('sinon'),
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
    it('should remove a task if delete_task(...) called');
    it('should list tasks');
    it('should return task state');
    it('should enqueue jobs to slaves');
});
