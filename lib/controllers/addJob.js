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
    var obj;
    var data;
    try {
        obj = JSON.parse(req.body.data);
        data = { start: obj[0], end: obj[1] };
    } catch (e) {
        return res.json(400, 'malformed or invalid JSON');
    }

    var userId = req.user._id;
    var updated_user = User.findById(userId, function(err, user){
        var tmp_user = req.user;
        var job = new Job({
            data : data,
            status : "new",
            owner : user.id
        });
        console.log(job);
        job.save(function(err){
            if (err) return res.json(400, err.errors);
            console.log('saved');
        });
        res.json({usr : user});
    });
};
