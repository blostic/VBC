'use strict';

var _ = require('lodash');

var splitter = {
    range : function (data, _parts) {
        var parts = _parts || Math.ceil((data.stop-data.start)/10000);

        if (data.stop - data.start < parts) {
            return [data];
        }

        var out = [],
        step = (data.stop - data.start) / parts;

        for (var i = 0; i < parts; i++) {
            out.push({
                start : Math.floor(data.start + step * i),
                stop  : Math.floor(data.stop - step * (parts - i - 1))
            });
        }

        return out;
    }
};

var types = {
    "sum" : {
        solver : function (data) {
            var sum = 0;
            for (var i = data.start; i !== data.stop; i++) {
                sum += i;
            }
            return sum;
        },
        splitter : splitter.range,
        reducer : function (results) {
            return _.reduce(results, function (memo, task) {
                return memo + task.partial_result;
            }, 0);
        }
    },
    "count-primary" : {
        /**
         * Counts primary numbers from a given range.
         *
         * @param range Object should be like {start:10, end:95}
         *
         * @return Array list of primary numbers
         */
        solver : function ( range ) {
            var isPrimeNum = function( num ) {
                if (num === 1 || num === 2){
                    return true;
                }

                var sqrt = Math.sqrt(num);
                for (var i = 2; i <= sqrt; i++) {
                    if (num % i === 0) {
                        return false;
                    }
                }
                return true;
            };

            var start = range.start,
            end = range.stop,
            primNums = [];

            for(var i = start; i < end; i++){
                if (isPrimeNum ( i )){
                    primNums.push(i);
                }
            }
            return primNums;
        },
        splitter : splitter.range,
        reducer : function (results) {
            return _.reduce(results, function (memo, task) {
                return memo.concat(task.partial_result);
            }, []);
        }
    }
};

module.exports = types;
