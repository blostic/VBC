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
        Job.create({
            creation_date : new Date('Jun 23, 2013'),
            status : "executing",
            code : " var x = 1; " +
                "     for (var i = 1; i < 5; i++) { " +
                "             x = x * i; " +
                "     } " +
                "     return x; ",
            data: [1,10],
            owner : test.id
        },{
            creation_date : new Date('Dec 23, 2013'),
            status : "executing",
            code : " var y = 1; " +
                "     for (var i = 1; i < 5; i++) { " +
                "             x = x * i; " +
                "     } " +
                "     return x; ",
            data: [2,4],
            owner : test.id
        }, function (err, job_1, job_2) {
            Task.create({
                status: "executing",
                data: {a:2, b:3},
                job : job_1.id
            },{
                status: "executing",
                data: {a:5, b:10},
                job : job_1.id
            },{
                status: "completed",
                data: {a:5, b:10},
                partial_result: [{c:1, d:3}],
                job : job_2.id
            }, function () {
                console.log("Database populated");
            });
        });
    });
});

