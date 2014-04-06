'use strict';

angular.module('vcApp')
    .factory('Auth', function($http, $cookieStore) {

        var accessLevels = routingConfig.accessLevels,
            userRoles = routingConfig.userRoles,
            currentUser = $cookieStore.get('user') || {
                username: '',
                role: userRoles.public
            };

        $cookieStore.remove('user');

        function changeUser(user) {
            angular.extend(currentUser, user);
            console.log(currentUser);
        }

        return {
            authorize: function(accessLevel, role) {
                if (role === undefined) {
                    role = currentUser.role;
                }

                return accessLevel.bitMask & role.bitMask;
            },
            isLoggedIn: function(user) {
                if (user === undefined) {
                    user = currentUser;
                }
                return user.role.title === userRoles.user.title || user.role.title === userRoles.admin.title;
            },
            register: function(user, success, error) {
                $http.post('/api/register', user).success(function(res) {
                    changeUser(res);
                    success();
                }).error(error);
            },
            login: function(user, success, error) {
                console.log(user);
                $http.post('/api/login', user).success(function(user) {
                    changeUser(user);
                    success(user);
                }).error(error);
            },
            logout: function(user, success, error) {
                $http.post('/api/logout').success(function() {
                    changeUser({
                        username: '',
                        role: userRoles.public
                    });
                    success();
                }).error(error);
            },

            show_jobs: function(success, error) {
                $http.get('/api/showJobs').success(success).error(error);
            },

            accessLevels: accessLevels,
            userRoles: userRoles,
            user: currentUser
        };
    });
