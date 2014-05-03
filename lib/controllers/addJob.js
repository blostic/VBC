'use strict';

var job_types = require('../job-types.js'),
    mongoose = require('mongoose'),
    User = mongoose.model('User'),
    Job = mongoose.model('Job'),
    Task = mongoose.model('Task'),
    Scheduler = require('../scheduler.js');

var scheduler = new Scheduler({
    jobTypes : job_types
});

/**
 * Add job
 */
exports.addJob = function(req, res) {
    var obj;
    var data;
    try {
        obj = JSON.parse(req.body.data);
        data = { start: obj[0], end: obj[1] };
    } catch (e) {
        return res.json(400, 'malformed or invalid JSON');
    }

    var type = "count-primary";
    var userId = req.user._id;
    scheduler.createJob(type, data, userId)
        .then(function (job) {
            return res.json({usr : userId});
//            scheduler.splitJob(job, function(err, job) {
//                if (err) {
//                    return res.json(500, 'cannot split job: ' + err);
//                }
//
//                scheduler.enqueueJob(job, function(err, job) {
//                    if (err) {
//                        return res.json(500, 'cannot enqueue job: ' + err);
//                    }
//
//                    res.json({usr : userId});
//                });
//            });
        })
        .fail( function(err) {
            return res.json(500, 'cannot create job: ' + err);
        })
        .done()

};
