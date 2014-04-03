'use strict';

var mongoose = require('mongoose'),
    User = mongoose.model('User'),
    passport = require('passport'),
    userRoles = require('../../app/scripts/routingConfig').userRoles;

/**
 * Create user
 */
exports.create = function(req, res, next) {
    console.log(req.body);
    var newUser = new User(req.body);
    newUser.provider = 'local';
    console.log(newUser);
    newUser.save(function(err) {
        if (err) return res.json(400, err);
        var wrappedUser = {
            role: userRoles[newUser.role],
            username: newUser.name
        };
        console.log(wrappedUser);
        req.logIn(newUser, function(err) {
            if (err) return next(err);
            res.cookie('user', JSON.stringify(wrappedUser));
            res.json(200, wrappedUser);
        });
    });
};

/**
 *  Get profile of specified user
 */
exports.show = function(req, res, next) {
    var userId = req.params.id;

    User.findById(userId, function(err, user) {
        if (err) return next(err);
        if (!user) return res.send(404);

        res.send({
            profile: user.profile
        });
    });
};

/**
 * Change password
 */
exports.changePassword = function(req, res, next) {
    var userId = req.user._id;
    var oldPass = String(req.body.oldPassword);
    var newPass = String(req.body.newPassword);

    User.findById(userId, function(err, user) {
        if (user.authenticate(oldPass)) {
            user.password = newPass;
            user.save(function(err) {
                if (err) return res.send(400);

                res.send(200);
            });
        } else {
            res.send(403);
        }
    });
};

/**
 * Get current user
 */
exports.me = function(req, res) {
    res.json(req.user || null);
};
