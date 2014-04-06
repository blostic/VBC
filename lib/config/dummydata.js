'use strict';

var mongoose = require('mongoose'),
    User = mongoose.model('User'),
    Job = mongoose.model('Job'),
    Task = mongoose.model('Task');
/**
 * Populate database with sample application data
 */

// Clear old users, then add a default user
User.find({}).remove(function() {

    var task_1 =  new Task({
        "status": "running",
        "data": {"a":2, "b":3} });

    var task_2 = new Task({
            "status": "running",
            "data": {"a":5, "b":10}});

    var task_3 = new Task({
            "status": "finished",
            "data": {"a":5, "b":10},
            "partial_result": [{c:1, d:3}]
        });

    var job_1 = new Job({
          "creation_date" : new Date('Jun 23, 2013'),
          "status" : "running",
          "code" : " var x = 1; " +
              "     for (var i = 1; i < 5; i++) { " +
              "             x = x * i; " +
              "     } " +
              "     return x; ",
          "tasks": [ task_1, task_2, task_3],
          "data": [1,10]
    });

    var job_2 = new Job({
        "creation_date" : new Date('Dec 23, 2013'),
        "status" : "running",
        "code" : " var y = 1; " +
            "     for (var i = 1; i < 5; i++) { " +
            "             x = x * i; " +
            "     } " +
            "     return x; ",
        "data": [2,4],
        "tasks": [ task_1, task_2]
    });

    User.create({
        provider: 'local',
        name: 'Test User',
        email: 'test@test.com',
        password: 'test',
        role: 'user',
        jobs: [job_1, job_2]
    },{
        provider: 'local',
        name: 'Test Admin',
        email: 'admin@admin.com',
        password: 'admin',
        role: 'admin'
    }, function() {
        console.log('finished populating users');
    });
});

