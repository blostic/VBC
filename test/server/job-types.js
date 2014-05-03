'use strict';

var jobTypes = require('../../lib/job-types');

describe('Job Types', function () {
    describe('#sum', function () {
        var sum = jobTypes.sum;
        describe('solver', function () {
            it('should return sum of numbers [data.start;data.stop)', function () {
                var result = sum.solver({
                    start : -2,
                    stop  : 5
                });

                result.should.equal(7);
            });
        });
        describe('reducer', function () {
            it('should sum up the results', function () {
                var q = function (n) { return { partial_result : n }; };
                sum.reducer([ q(1), q(11), q(30) ]).should.equal(42);
            });
        });
    });

    describe('#count-primary', function () {
        var primary = jobTypes["count-primary"];
        describe('solver', function () {
            var range, primNums,
                serverFunc = primary.solver;

            it('should count 3, 5, 7, 11, 13 numbers', function() {
                range = {start:3, stop: 15};
                primNums = serverFunc(range);
                primNums.should.have.length(5);
            });

            it('should count 1, 2, 3 numbers', function() {
                range = {start:1, stop: 4};
                primNums = serverFunc(range);
                primNums.should.have.length(3);
            });

            it('should count nothing', function() {
                range = {start: 4, stop: 4};
                var primNums = serverFunc(range);
                primNums.should.have.length(0);
            });
        });
        describe('reducer', function () {
            it('should concatenate the results', function () {
                var q = function () {
                    return { partial_result : Array.prototype.slice.call(arguments, 0) };
                };
                var result = primary.reducer([q(1,2,3), q(5,4)]);

                result.should.eql([1,2,3,5,4]);
            });
        });
    });
});

describe('Splitters', function () {
    describe('#range', function () {
        var splitter = jobTypes.sum.splitter;

        it('should split the data into chunks', function () {
            var split = splitter({
                start: 0,
                stop : 10
            }, 3);

            split.length.should.equal(3);
            split[0].should.eql({ start : 0, stop : 3 });
            split[1].should.eql({ start : 3, stop : 6 });
            split[2].should.eql({ start : 6, stop : 10 });
        });
        it('should ignore parts argument if too few elements', function () {
            var split = splitter({ start : 0, stop : 2 }, 4);

            split.length.should.equal(1);
            split[0].should.eql({ start : 0, stop : 2});
        });
    });
});
