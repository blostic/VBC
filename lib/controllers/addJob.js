//'use strict';
//
//var job_types = require('../job-types.js'),
//    mongoose = require('mongoose'),
//    User = mongoose.model('User'),
//    Job = mongoose.model('Job'),
//    Task = mongoose.model('Task'),
//    Scheduler = require('../scheduler.js'),
//    SlaveManager = require('../slave-manager.js');
//
//var scheduler = new Scheduler({
//    jobTypes : job_types,
//    slaveManager : new SlaveManager()
//});
//
///**
// * Add job
// */
//exports.addJob = function(req, res) {
//    var data = req.body.data;
//    console.log(data);
//    var type = req.body.job;
//    var userId = req.user._id;
//    scheduler.createJob(type, data, userId)
//        .then(function (job) {
//            return res.json({usr : userId});
//        })
//        .fail( function(err) {
//            return res.json(500, 'cannot create job: ' + err);
//        })
//        .done()
//
//};
//
//exports.startJob = function(req, res) {
//
//    var job = req.body.job;
//    var tasksCount = req.body.tasksCount;
//    console.log(req.body);
//
//    var type = req.body.job;
//    var userId = req.user._id;
//    scheduler.splitJob(job._id)
//        .then( function() {
//            scheduler.enqueueJob(job._id).done()
//            return res.json(200);
//        })
//        .fail( function(err) {
//             return res.json(500, 'Incorrect input. ' + err);
//        })
//        .done();
//};
