'use strict';

var userRoles = require('../app/scripts/routingConfig').userRoles,
    accessLevels = require('../app/scripts/routingConfig').accessLevels;
/**
 * Custom middleware used by the application
 */
module.exports = {

    /**
     *  Protect routes on your api from unauthenticated access
     */
    auth: function auth(req, res, next) {
        if (req.isAuthenticated()) return next();
        res.send(401);
    },

    /**
     * Set a cookie for angular so it knows we have an http session
     */
    setUserCookie: function(req, res, next) {
        var role = userRoles.public,
            username = '';
        if (req.user) {
            role = req.user.role;
            username = req.user.username;
        }
        res.cookie('user', JSON.stringify({
            'username': username,
            'role': role
        }));
        next();
    }
};
