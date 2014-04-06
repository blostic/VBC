'use strict';

describe('Directive: activeNav', function() {
    var scope, elem, $httpBackend, Auth,  location, compile;

    beforeEach(
        module('vcApp')
    );

    beforeEach(inject(function(_$httpBackend_, _Auth_) {
        $httpBackend = _$httpBackend_;
        Auth = _Auth_;
    }));

    beforeEach(function() {
        $httpBackend.expectGET('/partials/login').respond();
        $httpBackend.flush();
    });

    afterEach(function() {
        $httpBackend.verifyNoOutstandingExpectation();
        $httpBackend.verifyNoOutstandingRequest();
    });

    beforeEach(inject(function($compile, $rootScope, $location) {
        scope = $rootScope.$new();
        location = $location;
        compile = $compile;
    }));

    it('when location is same as "href" of link - the link must be decorated with "active" class',function(){
        location.path('register');
        $httpBackend.expectGET('/partials/register').respond();
        $httpBackend.flush();
        var elem = compile("<li data-active-nav ><a href='http://server/register'>Register</a></li>")(scope);
        //fire watch
        scope.$apply();
        expect(elem.hasClass('active')).toEqual(true);
    });

    it('when location is different from "href" of link - the "active" class must be removed',function(){
        location.path('register');
        $httpBackend.expectGET('/partials/register').respond();
        $httpBackend.flush();
        var elem = compile("<li data-active-nav class='active'><a href='http://server/login'>somelink</a></li>")(scope);
        //fire watch
        scope.$apply();
        expect(elem.hasClass('active')).toEqual(false);
    })

});
