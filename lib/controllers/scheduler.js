'use strict';

var Scheduler = require("../scheduler"),
    job_types = require('../job-types.js'),
    Job = require("../models/job"),
    Task = require("../models/task"),
    SlaveManager = require('../slave-manager.js');

var scheduler = new Scheduler({
    jobTypes : job_types,
    slaveManager : new SlaveManager({ listenPort: 9001,
                                      debug: true })
});

scheduler.init();

exports.createJob = function (req, res) {
    var job_type = req.body.type,
        data     = req.body.data,
        user;

    user = req.user._id;

    scheduler.createJob(job_type, data, user)
    .then(function (job) {
        res.json({usr : user, job : job._id});
    })
    .fail(function (err) {
        return res.json(500, 'cannot create job: ' + err);
    })
    .done();
};

exports.removeJob = function (req, res) {
    var job_id = req.body.job_id;

    if (job_id === undefined) {
        return res.json(400, 'unspecified job id');
    }

    scheduler.removeJob(job_id)
    .then(function () {
        res.json();
    })
    .fail(function (err) {
        return res.json(500, 'cannot remove job: ' + err);
    })
    .done();
};

exports.splitJob = function (req, res) {
    var job_id = req.body.job_id,
        count = req.body.count % 10000;

    if (job_id === undefined) {
        return res.json(400, 'unspecified job id');
    }
    res.json(202);
    setTimeout(function(){
        scheduler.splitJob(job_id, count)
            .then(function (tasks) {
                scheduler.enqueueJob(job_id)
                    .then(function (job, tasks) {
                        //todo
                    })
                    .fail(function (err) {
                        return res.json(500, 'cannot enqueue job: ' + err);
                    })
                    .done();
            })
            .fail(function (err) {
                return res.json(500, 'cannot split job: ' + err);
            })
            .done();
    }, 200);
};

exports.enqueueJob = function (req, res) {
    var job_id = req.body.job_id;

    if (job_id === undefined) {
        return res.json(400, 'unspecified job id');
    }
    res.json(200);
};

exports.listJobs = function (req, res) {
     var user = req.user._id;

     Job.findQ({ owner : user })
     .then(function (jobs) {
         res.json({jobs : jobs.map(function (job) {
             return {
                id            : job.id,
                name          : job.name,
                status        : job.status,
                creation_date : job.creation_date,
                type          : job.type,
                data          : job.data,
                result        : job.result
                // add what is needed
             };
         })});
     })
     .fail(function (err) {
         return res.json(500, 'cannot list jobs' + err);
     })
     .done();
};

exports.getJobInfo = function (req, res) {
    console.log(req.body);
    var job_id = req.body.job_id;

    if (job_id === undefined) {
        return res.json(400, 'unspecified job id');
    }
    Job.findByIdQ(job_id)
    .then(function (job) {
        Task.countQ({ job: job.id})
            .then(function (total){
                Task.countQ({ job: job.id, status: "completed"})
                    .then(function (completed){
                        res.json({
                            id            : job.id,
                            name          : job.name,
                            status        : job.status,
                            creation_date : job.creation_date,
                            type          : job.type,
                            data          : job.data,
                            result        : job.result,
                            totalTasks    : total,
                            finishedTasks : completed
                        });
                    })
                    .done();
            })
            .done();

    })
    .fail(function (err) {
        return res.json(500, "cannot fetch job info: " + err);
    })
    .done();
};
