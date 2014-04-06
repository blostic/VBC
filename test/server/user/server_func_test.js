'use strict';

var should = require('should'),
	mongoose = require('mongoose'),
	serverFunc = require('../../../lib/models/server_function'),
	range;


xdescribe('Count primary numbers function test', function(){
	before(function(done){
		range = {start:3, end: 15};
		done();
	});

	it('should count 3, 5, 7, 11, 13 numbers', function(done){
		console.log('first test');
		primNums = serverFunc.countPrimaryNumbers(range);
		primNums.should.have.length(6);
		//done();
	});
});
