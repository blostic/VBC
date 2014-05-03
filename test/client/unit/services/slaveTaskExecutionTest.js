'use strict';

describe('Client side task execution', function(){
    var Slave;
    beforeEach(
        module('vcApp')
    );

    beforeEach(inject(function(_Slave_) {
        Slave = _Slave_;
    }));

    it('should return 5^2', function(){
        var square_function = function (data) {
            return data.a*data.a;
        };
        var inputData = {"id":1, "function": square_function.toString(), "data":{"a":5}};
        var result = Slave.execute_task(inputData);
        var shouldBe = {"result":25};
        shouldBe.id = 1;
        expect(result).toEqual(shouldBe);
        shouldBe.result = 35;
        expect(result == shouldBe).toEqual(false)
    });

    it('should return 5*2', function(){
        var multiplication = function (data) {
            return data.a*data.b;
        };
        var inputData = {"id":1, "function": multiplication.toString(), data: {"a":5, "b":2}};
        var result = Slave.execute_task(inputData);
        var shouldBe = {"result":10};
        shouldBe.id = 1;
        expect(result).toEqual(shouldBe);
        shouldBe.result = 11;
        shouldBe.id = 1;
        expect(result == shouldBe).toEqual(false)
    });

});