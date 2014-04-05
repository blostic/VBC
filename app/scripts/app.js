'use strict';

angular.module('vcApp', [
    'ngCookies',
    'ngResource',
    'ngSanitize',
    'ui.router'
])
    .config(function($stateProvider, $urlRouterProvider, $locationProvider, $httpProvider) {
        var access = routingConfig.accessLevels;

        // Public routes
        $stateProvider
            .state('public', {
                abstract: true,
                template: '<ui-view/>',
                data: {
                    access: access.public
                }
            })
            .state('public.404', {
                url: '/404/',
                templateUrl: '/partials/404'
            });

        // Anonymous routes
        $stateProvider
            .state('anon', {
                abstract: true,
                template: '<ui-view/>',
                data: {
                    access: access.anon
                }
            })
            .state('anon.login', {
                url: '/login/',
                templateUrl: '/partials/login',
                controller: 'LoginCtrl'
            })
            .state('anon.register', {
                url: '/register/',
                templateUrl: '/partials/register',
                controller: 'RegisterCtrl'
            });

        // Regular user routes
        $stateProvider
            .state('user', {
                abstract: true,
                template: '<ui-view/>',
                data: {
                    access: access.user
                }
            })
            .state('user.home', {
                url: '/',
                templateUrl: '/partials/home',
                controller: 'HomeCtrl'
            })
            .state('user.newJob', {
                url: '/newjob/',
                templateUrl: '/partials/user/newjob'
            })
            .state('user.jobs', {
                url: '/jobs/',
                templateUrl: '/partials/user/jobs',
                controller: "JobsCtrl"
            });

        // Admin routes
        $stateProvider
            .state('admin', {
                abstract: true,
                template: '<ui-view/>',
                data: {
                    access: access.admin
                }
            })
            .state('admin.userlist', {
                url: '/userlist/',
                templateUrl: '/partials/admin/userlist',
                controller: 'AdminCtrl'
            });


        $urlRouterProvider.otherwise('/404');

        // FIX for trailing slashes. Gracefully "borrowed" from https://github.com/angular-ui/ui-router/issues/50
        $urlRouterProvider.rule(function($injector, $location) {
            if ($location.protocol() === 'file') {
                return;
            }
            var path = $location.path(),
            // Note: misnomer. This returns a query object, not a search string
                search = $location.search(),
                params;

            // check to see if the path already ends in '/'
            if (path[path.length - 1] === '/') {
                return;
            }

            // If there was no search string / query params, return with a `/`
            if (Object.keys(search).length === 0) {
                return path + '/';
            }

            // Otherwise build the search string and return a `/?` prefix
            params = [];
            angular.forEach(search, function(v, k) {
                params.push(k + '=' + v);
            });
            return path + '/?' + params.join('&');
        });

        $locationProvider.html5Mode(true);

        // Intercept 401s and redirect you to login
        $httpProvider.interceptors.push(function($q, $location) {
            return {
                'responseError': function(response) {
                    if (response.status === 401 || response.status === 403) {
                        $location.path('/');
                    }
                    return $q.reject(response);
                }
            };
        });
    })
    .run(function($rootScope, $state, Auth) {

        //Redirect to login if route requires auth and you're not logged in
        $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState) {
            if (!Auth.authorize(toState.data.access)) {
                $rootScope.error = 'Seems like you tried accessing a route you don\'t have access to...';
                event.preventDefault();

                if (fromState.url === '^') {
                    if (Auth.isLoggedIn()) {
                        $state.go('user.home');
                    } else {
                        $rootScope.error = null;
                        $state.go('anon.login');
                    }
                }
            }
        });
    });
