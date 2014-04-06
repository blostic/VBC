'use strict';

var should = require('should'),
	mongoose = require('mongoose'),
	serverFunc = require('../../../lib/models/server_function'),
	range,
	primNums;


describe('Count primary numbers function test', function(){
	
	it('should count 3, 5, 7, 11, 13 numbers', function(done){
		range = {start:3, end: 15};
		primNums = serverFunc(range);
		primNums.should.have.length(5);
		done();
	});

	it('should count 1, 2, 3 numbers', function(done){
		range = {start:1, end: 4};
		primNums = serverFunc(range);
		primNums.should.have.length(3);
		done();
	});

	it('should count nothing', function(done){
		range = {start: 4, end: 4};
		var primNums = serverFunc(range);
		primNums.should.have.length(0);
		done();
	});
});
