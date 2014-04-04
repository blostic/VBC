'use strict';

var mongoose = require('mongoose'),
    passport = require('passport'),
    userRoles = require('../../app/scripts/routingConfig').userRoles;

/**
 * Logout
 */
exports.logout = function(req, res) {
    req.logout();
    res.send(200);
};

/**
 * Login
 */
exports.login = function(req, res, next) {
    passport.authenticate('local', function(err, user, info) {
        var error = err || info;
        if (error) return res.json(401, error);
        var wrappedUser = {
            role: userRoles[user.role],
            username: user.name
        };
        console.log(userRoles);
        console.log(wrappedUser);
        req.logIn(user, function(err) {
            if (err) return res.send(err);
            res.json(200, wrappedUser);
        });
    })(req, res, next);
};
