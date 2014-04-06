'use strict';

describe('Service: Auth', function() {
    var Auth,
        $httpBackend;

    beforeEach(module('vcApp'));

    beforeEach(inject(function(_$httpBackend_, _Auth_, $rootScope) {
        $httpBackend = _$httpBackend_;
        Auth = _Auth_;
    }));

    // On module load there will always be a stateChange event to the login state
    beforeEach(function() {
        $httpBackend.expectGET('/partials/login').respond();
        $httpBackend.flush();
    });

    afterEach(function() {
        $httpBackend.verifyNoOutstandingExpectation();
        $httpBackend.verifyNoOutstandingRequest();
    });

    describe('instantiate', function() {
        it('should have isLoggedIn function', function() {
            expect(Auth.isLoggedIn).toBeDefined();
            expect(angular.isFunction(Auth.isLoggedIn)).toBeTruthy();
        });

        it('should have authorize function', function() {
            expect(Auth.authorize).toBeDefined();
            expect(angular.isFunction(Auth.authorize)).toBeTruthy();
        });

        it('should have login function', function() {
            expect(Auth.login).toBeDefined();
            expect(angular.isFunction(Auth.login)).toBeTruthy();
        });

        it('should have logout function', function() {
            expect(Auth.logout).toBeDefined();
            expect(angular.isFunction(Auth.logout)).toBeTruthy();
        });

        it('should have register function', function() {
            expect(Auth.register).toBeDefined();
            expect(angular.isFunction(Auth.register)).toBeTruthy();
        });

        it('should have the user object', function() {
            expect(Auth.user).toBeDefined();
            expect(angular.isObject(Auth.user)).toBeTruthy();
        });

        it('should have the userRoles object', function() {
            expect(Auth.userRoles).toBeDefined();
            expect(angular.isObject(Auth.userRoles)).toBeTruthy();
        });

        it('should have the accessLevels object', function() {
            expect(Auth.accessLevels).toBeDefined();
            expect(angular.isObject(Auth.accessLevels)).toBeTruthy();
        });

        it('should set the user object with no name and public role', function() {
            expect(Auth.user).toEqual({ username: '', role: Auth.userRoles.public });
        });
    });

    describe('authorize', function() {
        it('should return 0 when role not recognized', function() {
            expect(Auth.authorize('foo')).toEqual(0);
        });

        it('should return 1 when role is recognized', function() {
            var accessLevels = { bitMask: 1 };
            var role = { bitMask: 1 };
            expect(Auth.authorize(accessLevels, role)).toEqual(1);
        });

        it('should return 0 when role is omitted and not equal', function() {
            var accessLevels = { bitMask: 0 };
            expect(Auth.user.role.bitMask).toEqual(1);
            expect(Auth.authorize(accessLevels)).toEqual(0);
        });

        it('should return 1 when role is omitted but equal', function() {
            var accessLevels = { bitMask: 1 };
            expect(Auth.user.role.bitMask).toEqual(1);
            expect(Auth.authorize(accessLevels)).toEqual(1);
        });
    });

    describe('isLoggedIn', function() {
        it('should use the currentUser when use omitted', function() {
            // current user has role public
            expect(Auth.isLoggedIn()).toEqual(false);
        });

        it('should return false when user has role public', function() {
            var user = { role: { title: 'public' } };
            expect(Auth.isLoggedIn(user)).toEqual(false);
        });

        it('should return true when user has role user', function() {
            var user = { role: { title: 'user' } };
            expect(Auth.isLoggedIn(user)).toEqual(true);
        });

        it('should return true when user has role admin', function() {
            var user = { role: { title: 'admin' } };
            expect(Auth.isLoggedIn(user)).toEqual(true);
        });
    });

    describe('register', function() {
        it('should make a request and invoke callback', function() {
            var invoked = false;
            var success = function() {
                invoked = true;
            };
            var error = function() {};
            $httpBackend.expectPOST('/api/register').respond();
            Auth.register({}, success, error);
            $httpBackend.flush();
            expect(invoked).toBeTruthy();
        });

        it('should append the user', function() {
            var success = function() {};
            var error = function() {};
            $httpBackend.expectPOST('/api/register').respond({ 'user': 'foo' });
            Auth.register({}, success, error);
            $httpBackend.flush();
            expect(Auth.user).toEqual({ username : '', role : { bitMask : 1, title : 'public' }, user : 'foo' });
        });
    });

    describe('login', function() {
        it('should make a request and invoke callback', function() {
            var invoked = false;
            var success = function() {
                invoked = true;
            };
            var error = function() {};
            $httpBackend.expectPOST('/api/login').respond();
            Auth.login({}, success, error);
            $httpBackend.flush();
            expect(invoked).toBeTruthy();
        });

        it('should append the user', function() {
            var success = function() {};
            var error = function() {};
            $httpBackend.expectPOST('/api/login').respond({ 'user': 'bar' });
            Auth.login({}, success, error);
            $httpBackend.flush();
            expect(Auth.user).toEqual({ username : '', role : { bitMask : 1, title : 'public' }, user : 'bar' });
        });
    });

    describe('logout', function() {
        it('should make a request and invoke callback', function() {
            var invoked = false;
            var user = {};
            var success = function() {
                invoked = true;
            };
            var error = function() {};
            $httpBackend.expectPOST('/api/logout').respond();
            Auth.logout(user, success, error);
            $httpBackend.flush();
            expect(invoked).toBeTruthy();
        });
    });
});
