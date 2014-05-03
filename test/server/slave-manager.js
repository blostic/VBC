'use strict';

var SlaveManager = require('../../lib/slave-manager'),
    io = require('socket.io-client'),
    Q = require('q'),
    should = require('should');

describe('SlaveManager', function() {
    it('should listen for incoming slave connections', function (done) {
        var manager = new SlaveManager(9001);
        var socket = io.connect('http://localhost:9001');
        var deferred = Q.defer();

        socket.on('connect', function() {
            deferred.resolve();
        });
        socket.on('connect_failed', function() {
            deferred.fail();
        });

        deferred.promise
            .then(done)
            .fail(function() {
                should.fail('connection not established');
            })
            .done();
    });

    it('should pass tasks to the slave', function(done) {
        var manager = new SlaveManager(9002);
        var socket = io.connect('http://localhost:9002');

        socket.on('task', function(task) {
            task.id.should.eql('testTaskId'),
            console.log(task);
            console.log(task.id);
            console.log(task.task);
            console.log(task.data);

            socket.emit('task_completed', {
                taskId: task.id,
                result: 42
            });
        });

        var task = {
            id: 'testTaskId',
            status: 'testStatus',
            data: 'testData',
            partial_result: null,
            code: 'testCode',
            job: 'testJob'
        };
        var pkg = [ task ];
        var taskPromise = manager.enqueue(pkg);
        var progressNotified = false;

        taskPromise
            .progress(function(completedTask) {
                console.log('progress');
                task.should.eql(completedTask);
                progressNotified = true;
            })
            .then(function(result) {
                console.log('resolved');
                progressNotified.should.be.true;
                result.should.eql(pkg);
                done();
            })
            .done();

        taskPromise
            .fail(function() {
                throw new Error('task promise from SlaveManager failed');
            });
    });
});
