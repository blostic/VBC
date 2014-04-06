'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    crypto = require('crypto');

var isPrimeNum = function( num ) {
	if (num == 1 || num == 2){
		return true;
	}

	var sqrt = Math.sqrt(num);
	for (var i = 2; i <= sqrt; i++) {
		if (num % i == 0) {
			return false;
		}
	}
	return true;
}

/**
 * Simple server function implementation.
 *
 * It counts primary numbers from a given range.
 *
 * @param range shoud be like: range = {start:10, end:95}
 *
 * @return 	   list of primary numbers 
 */
var countPrimaryNumbers = function ( range ) {
	var start = range.start,
		end = range.end,
		primNums = new Array();

	for(var i = start; i <= end; i++){
		if (isPrimeNum ( i )){
			primNums.push(i);
			//console.log(i);
		}
	}
	return primNums;
}

exports = module.exports = countPrimaryNumbers;