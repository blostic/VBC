'use strict';

var mongoose = require('mongoose'),
    User = mongoose.model('User'),
    passport = require('passport'),
    Job = mongoose.model('Job'),
    Task = mongoose.model('Task');

var task_1 =  new Task({
    "status": "initialized",
    "data": {"a":2, "b":3} });

var job_1 = new Job({
      "creation_date" : new Date(),
      "status" : "initialized",
      "code" : " var x = 1; " +
          "     for (var i = 1; i < 5; i++) { " +
          "             x = x * i; " +
          "     } " +
          "     return x; ",
      "tasks": [ task_1]
});

/**
 * Add job
 */
exports.addJob = function(req, res) {
    console.log('job added, i chuj');
    res.json(200, "got json");
    //console.log(req.body);
    //console.log('user:');
    //console.log(req.user);
    var userId = req.user._id;
    var user;
    var updated_user = User.findById(userId, function(user){
        //console.log('udpated user:');
        var tmp_user = req.user;
        tmp_user.jobs.push(job_1);
        //console.log(tmp_user);
    	tmp_user.save(function(err){
			if (err) return res.json(400, err.errors);
			console.log('saved');
    	});
        res.json({usr : req.user});
    });
};
