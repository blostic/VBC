'use strict';

var should = require('should');

describe('Communication Bus', function () {
    var Bus = require('../../lib/bus.js');

    afterEach(function () {
        Bus.clean();
    });

    it('should create bus and return it', function () {
        Bus.has('test').should.be.false;

        var bus = Bus.get('test');

        bus.should.not.equal(undefined);
    });

    it('should test if bus exists', function () {
        Bus.has('test').should.be.false;
        Bus.get('test');
        Bus.has('test').should.be.true;
    });

    it('should transmit events', function (done) {
        var bus = Bus.get('test'),
            arg = {
                test : "test"
            };

        bus.on('ev', function (argument) {
            argument.should.be.exactly(arg);
            done();
        });

        bus.emit('ev', arg);
    });

    it('should be able to remove given bus', function () {
        Bus.has('test').should.be.false;
        Bus.has('foo').should.be.false;

        Bus.get('test');
        Bus.get('foo');

        Bus.clean('test');

        Bus.has('test').should.be.false;
        Bus.has('foo').should.be.true;
    });
});
