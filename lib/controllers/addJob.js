'use strict';

var mongoose = require('mongoose'),
    User = mongoose.model('User'),
    passport = require('passport'),
    Job = mongoose.model('Job'),
    Task = mongoose.model('Task');

/**
 * Add job
 */
exports.addJob = function(req, res) {
    console.log('job added, i chuj');
    res.json(200, "got json");
    var range = req.body.data.split(',');
    var data = { start: range[0], end: range[1] };
    var userId = req.user._id;
    var updated_user = User.findById(userId, function(user){
        var tmp_user = req.user;
		var job = new Job({
        	data : data,
            status : "new",
            tasks : []
        });
        console.log(job);
        tmp_user.jobs.push(job);
    	tmp_user.save(function(err){
			if (err) return res.json(400, err.errors);
			console.log('saved');
    	});
        res.json({usr : req.user});
    });
};
