'use strict';

var serverFunc = require('../models/server_function.js'), // TODO: move that file somewhere else
    mongoose = require('mongoose'),
    Scheduler = require('../scheduler.js'),
    User = mongoose.model('User'),
    passport = require('passport'),
    Job = mongoose.model('Job'),
    Task = mongoose.model('Task');

var scheduler = new Scheduler();
// TODO: FIXME: ugly! move to constructor or whatever
scheduler.reducer = function (tasks) {
    return tasks[0].partial_result;
};

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

    var code = serverFunc.toString();
    var userId = req.user._id;
    scheduler.createJob(code, data, userId, function(err, job) {
        if (err) {
            return res.json(500, 'cannot create job: ' + err);
        }

        scheduler.splitJob(job, function(err, job) {
            if (err) {
                return res.json(500, 'cannot split job: ' + err);
            }

            scheduler.enqueueJob(job, function(err, job) {
                if (err) {
                    return res.json(500, 'cannot enqueue job: ' + err);
                }

                res.json({usr : userId});
            });
        });
    });
};
