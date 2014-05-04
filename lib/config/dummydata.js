'use strict';

var mongoose = require('mongoose'),
    User = mongoose.model('User'),
    Job = mongoose.model('Job'),
    Task = mongoose.model('Task');
/**
 * Populate database with sample application data
 */

// clean database
var cleanDB = function (fn) {
    User.remove({}, function () {
        Job.remove({}, function () {
            Task.remove({}, function () {
                fn();
            });
        });
    });
};

cleanDB(function() {
    User.create({
        provider: 'local',
        name: 'Test User',
        email: 'test@test.com',
        password: 'test',
        role: 'user'
    },{
        provider: 'local',
        name: 'Test Admin',
        email: 'admin@admin.com',
        password: 'admin',
        role: 'admin'
    }, function(err, test, admin) {
    });
});

