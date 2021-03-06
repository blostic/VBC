'use strict';

describe('Client side task execution', function(){

    beforeEach(
        module('vcApp')
    );

    it('should return 5^2', function(){
        var square_function = function (data) {
            return data.a*data.a;
        };
        var inputData = {"task_id":1, "code": square_function.toString(), "data":{"a":5}};
        var result = execute_task(inputData);
        var shouldBe = {"result":25};
        shouldBe.task_id = 1;
        expect(result).toEqual(shouldBe);
        shouldBe.result = 35;
        expect(result == shouldBe).toEqual(false)
    });

    it('should return 5*2', function(){
        var multiplication = function (data) {
            return data.a*data.b;
        };
        var inputData = {"task_id":1, "code": multiplication.toString(), data: {"a":5, "b":2}};
        var result = execute_task(inputData);
        var shouldBe = {"result":10};
        shouldBe.task_id = 1;
        expect(result).toEqual(shouldBe);
        shouldBe.result = 11;
        shouldBe.task_id = 1;
        expect(result == shouldBe).toEqual(false)
    });

});
