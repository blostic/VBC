'use strict';

var Scheduler = require("../scheduler"),
    Problems = require("../problems"),
    Job = require("../models/job");

var scheduler = new Scheduler();

exports.createJob = function (req, res) {
    var job_type = req.body.type,
        data     = req.body.data,
        user;

    user = req.user._id;

    scheduler.create(job_type, data, user)
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
    var job_id = req.body.job_id;

    if (job_id === undefined) {
        return res.json(400, 'unspecified job id');
    }

    scheduler.splitJob(job_id)
    .then(function (job, tasks) {
        res.json({count:tasks.length});
    })
    .fail(function (err) {
        return res.json(500, 'cannot split job: ' + err);
    })
    .done();
};

exports.enqueueJob = function (req, res) {
    var job_id = req.body.job_id;

    if (job_id === undefined) {
        return res.json(400, 'unspecified job id');
    }

    scheduler.enqueueJob(job_id)
    .then(function (job, tasks) {
        res.json({count:tasks.length});
    })
    .fail(function (err) {
        return res.json(500, 'cannot enqueue job: ' + err);
    })
    .done();
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
                type          : job.type
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
    var job_id = req.data.job_id;

    if (job_id === undefined) {
        return res.json(400, 'unspecified job id');
    }

    Job.findByIdQ(job_id)
    .then(function (job) {
        res.json({
            id            : job.id,
            name          : job.name,
            status        : job.status,
            creation_date : job.creation_date,
            type          : job.type
            // add what is needed
        });
    })
    .fail(function (err) {
        return res.json(500, "cannot fetch job info: " + err);
    })
    .done();
};
