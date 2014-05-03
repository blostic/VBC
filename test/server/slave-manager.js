'use strict';

var SlaveManager = require('../../lib/slave-manager'),
    io = require('socket.io-client'),
    Q = require('q'),
    should = require('should'),
    _ = require('lodash');

describe('SlaveManager', function() {
    it('should listen for incoming slave connections', function(done) {
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

    it('should resolve immediately for empty task list', function(done) {
        var manager = new SlaveManager(9002);
        var promise = manager.enqueue([]);

        promise.fail(function() {
            throw new Error('task promise from SlaveManager failed');
        });
        promise.progress(function() {
            throw new Error('the promise should be resolved immediately');
        });
        promise.then(done).done();
    });

    it('should pass tasks to the slave', function(done) {
        var manager = new SlaveManager(9003);
        var socket = io.connect('http://localhost:9003');

        var task = {
            id: 'testTaskId',
            status: 'testStatus',
            data: 'testData',
            partial_result: null,
            code: 'testCode',
            job: 'testJob'
        };

        socket.on('task', function(_task) {
            _task.id.should.eql(task.id),
            _task.task.should.eql(task.code);
            _task.data.should.eql(task.data);

            socket.emit('task_completed', {
                taskId: _task.id,
                result: 42
            });
        });

        var pkg = [ task ];
        var taskPromise = manager.enqueue(pkg);
        var progressNotified = false;

        taskPromise
            .progress(function(completedTask) {
                task.should.eql(completedTask);
                progressNotified = true;
            })
            .then(function(result) {
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

    it('should assign tasks to multiple slaves', function(done) {
        var NUM_SLAVES = 3;
        var NUM_TASKS = 9;

        var manager = new SlaveManager(9004);
        var sockets = [];

        for (var i = 0; i < NUM_SLAVES; ++i) {
            var socket = io.connect('http://localhost:9004', { 'force new connection': 1 });
            socket.tasksCompleted = 0;
            sockets.push(socket);
        }

        var tasks = [];
        for (var i = 0; i < NUM_TASKS; ++i) {
            tasks.push({
                id: i,
                status: 'testStatus',
                data: 'testData' + i,
                partial_result: null,
                code: 'testCode' + i,
                job: 'testJob'
            });
        }

        _.forEach(sockets, function(socket) {
            socket.on('task', function(msg) {
                msg.id.should.be.within(0, NUM_TASKS - 1);
                msg.task.should.eql(tasks[msg.id].code);
                msg.data.should.eql(tasks[msg.id].data);

                socket.emit('task_completed', {
                    taskId: msg.id,
                    result: 100 + msg.id
                });

                socket.tasksCompleted++;
            });
        });

        var pkgPromise = manager.enqueue(tasks);
        var progress = 0;

        pkgPromise
            .progress(function(task) {
                task.partial_result.should.eql(100 + task.id);
                progress++;
            })
            .then(function(tasks) {
                var minTasksCompleted = _.reduce(sockets, function(value, socket) {
                    return Math.min(value, socket.tasksCompleted);
                }, NUM_TASKS);

                minTasksCompleted.should.be.above(0);
                progress.should.eql(NUM_TASKS);
                done();
            })
            .done();

        pkgPromise
            .fail(function() {
                throw new Error('task promise from SlaveManager failed');
            });
    });
});
