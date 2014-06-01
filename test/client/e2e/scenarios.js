'use strict';

describe('UI: Add Job page', function() {
    var ctrl, scope, httpMock;

    var login = function() {
        // ensure the user is not already logged in
        jQuery.ajax({
            type: 'POST',
            url: '/api/logout',
            async: false
        });

        browser().navigateTo('/login/');

        input('email').enter('test@test.com');
        input('password').enter('test');

        element('button[type=submit]', 'submit button').click();
    }

    it('should redirect to login page when user is not logged in', function() {
        browser().navigateTo('/jobs/');

        expect(browser().location().url()).toBe('/login/');
    });

    it('should display input form on /newjob/', function() {
        login();
        browser().navigateTo('/jobs/');

        select("selectedFunction").option("sum");

        expect(element('input[name=start]:visible', 'args range').count()).toBe(1);
        expect(element('input[name=stop]:visible', 'args range').count()).toBe(1);
        expect(element('button[type=submit]:visible', 'submit button').count()).toBe(1);
        expect(element('p.label-danger:visible', 'error message').count()).toBe(0);
    });

    xit('should display error message when user attepmts to add a job with invalid input', function() {
        login();
        browser().navigateTo('/jobs/');
        select("selectedFunction").option("sum");
        input('beginning').enter('');
        element('button[type=submit]', 'submit button').click();

        expect(browser().location().url()).toBe('/newjob/');
        expect(element('p.label-danger:visible', 'error message').count()).toBe(1);
        expect(element('p.label-danger', 'error message').text()).not().toBe('');
    });

    it('should redirect to /jobs/ when the job is added', function() {
        login();
        browser().navigateTo('/jobs/');
        select("selectedFunction").option("sum");
        input('start').enter(1);
        element('button[type=submit]', 'submit button').click();

        expect(browser().location().url()).toBe('/jobs/');
    });
});
