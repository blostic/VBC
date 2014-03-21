'use strict';

/* http://docs.angularjs.org/guide/dev_guide.e2e-testing */

describe('PhoneCat App', function() {

    it('should redirect index.html to index.html#/phones', function() {
        browser().navigateTo('settings');
        //expect(browser().location().url()).toBe('/login');
    });

});
