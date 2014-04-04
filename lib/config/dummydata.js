'use strict';

var mongoose = require('mongoose'),
    User = mongoose.model('User')

/**
 * Populate database with sample application data
 */

// Clear old users, then add a default user
User.find({}).remove(function() {
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
    }, function() {
        console.log('finished populating users');
    });
});

