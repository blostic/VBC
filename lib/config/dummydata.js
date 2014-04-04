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
          "code" : "function(a){ " +
              "     var x = 1; " +
              "     for (var i = 1; i < 5; i++) { " +
              "             x = x * i; " +
              "     } " +
              "     return x; " +
              "}",
          "tasks": [ task_1, task_2, task_3]
    });

    User.create({
        provider: 'local',
        name: 'Test User',
        email: 'test@test.com',
        password: 'test',
        role: 'user',
        jobs: [job_1]
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

