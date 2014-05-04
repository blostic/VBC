'use strict';

var users = require('./controllers/users'),
    _ = require('underscore'),
    path = require('path'),
    passport = require('passport'),
    AuthCtrl = require('./controllers/auth'),
    UserCtrl = require('./controllers/users'),
    AddJobCtrl = require('./controllers/addJob'),
    userRoles = require('../app/scripts/routingConfig').userRoles,
    accessLevels = require('../app/scripts/routingConfig').accessLevels;

var routes = [
    // Views
    {
        path: '/partials/*',
        httpMethod: 'GET',
        middleware: [

            function(req, res) {
                var requestedView = path.join('./', req.url);
                res.render(requestedView);
            }
        ]
    },
    // Local Auth
    {
        path: '/api/register',
        httpMethod: 'POST',
        middleware: [UserCtrl.create]
    }, {
        path: '/api/login',
        httpMethod: 'POST',
        middleware: [AuthCtrl.login]
    }, {
        path: '/api/logout',
        httpMethod: 'POST',
        middleware: [AuthCtrl.logout]
    }, {
        path: '/api/showJobs',
        httpMethod: 'GET',
        middleware: [UserCtrl.showMeJobs]
    },

    // User resource
    {
        path: '/users',
        httpMethod: 'GET',
        middleware: [UserCtrl.create],
        accessLevel: accessLevels.admin
    },

    {
        path: '/api/addJob',
        httpMethod: 'POST',
        middleware: [AddJobCtrl.addJob]
    },
    {
        path: '/api/startJob',
        httpMethod: 'POST',
        middleware: [AddJobCtrl.startJob]
    },

    // All other get requests should be handled by AngularJS's client-side routing system
    {
        path: '/*',
        httpMethod: 'GET',
        middleware: [
            function(req, res) {
                var role = 'public', username = '';
                if(req.user) {
                    role = req.user.role;
                    username = req.user.email;
                }
                res.cookie('user', JSON.stringify({
                    'username': username,
                    'role': userRoles[role]
                }));
                res.render('index');
            }
        ]
    }
];

function ensureAuthorized(req, res, next) {
    var role;
    if (!req.user) role = userRoles.public;
    else role = userRoles[req.user.role];

    var accessLevel = _.findWhere(routes, {
        path: req.route.path
    }).accessLevel || accessLevels.public;

    var accessLvl = accessLevel.bitMask & role.bitMask;
    if (!accessLvl) return res.send(403);
    return next();
}

/**
 * Application routes
 */
module.exports = function(app) {

    _.each(routes, function(route) {
        route.middleware.unshift(ensureAuthorized);
        var args = _.flatten([route.path, route.middleware]);
        switch (route.httpMethod.toUpperCase()) {
            case 'GET':
                app.get.apply(app, args);
                break;
            case 'POST':
                app.post.apply(app, args);
                break;
            case 'PUT':
                app.put.apply(app, args);
                break;
            case 'DELETE':
                app.delete.apply(app, args);
                break;
            default:
                throw new Error('Invalid HTTP method specified for route ' + route.path);
        }
    });
};
