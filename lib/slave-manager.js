'use strict';

var io = require('socket.io'),
    _ = require('lodash'),
    Q = require('q');

var SlaveManager = function (listenPort, debug) {
    this.debug = !!debug;

    // WebSockets to slaves who are not processing anything
    this.idleSlaves = [];
    // { socket: WebSocket, taskId: TaskId }
    this.busySlaves = [];
    // { taskId => {
    //       task: Task,
    //       packageId: String
    // } }
    this.tasks = {};
    // contains tasks from this.tasks
    this.taskQueue = [];
    // { packageId => {
    //       deferred: Q.Deferred,
    //       completed: Number,
    //       total: Number,
    //       tasks: [ Task ]
    // } }
    this.taskPackages = {};
    this.taskPackageIdGenerator = 0;

    this.serverSocket = io.listen(listenPort, { log: this.debug });

    var manager = this;

    this.serverSocket.on('connection', function(socket) {
        manager.idleSlaves.push({ socket: socket, taskId: null });
        manager._assignTasks();

        socket.on('task_completed', function(msg) {
            manager._debugLog('task completed: ' + msg.taskId
                              + ', result: ' + msg.result);

            var taskInfo = manager.tasks[msg.taskId];
            if (taskInfo === undefined) {
                console.error('invalid task ID received from slave');
                return;
            }

            var pkg = manager.taskPackages[taskInfo.packageId];
            if (pkg === undefined) {
                console.error('task ' + msg.taskId
                              + ' is assigned to invalid package '
                              + taskInfo.packageId);
                return;
            }

            taskInfo.task.partial_result = msg.result;
            pkg.completed++;
            pkg.deferred.notify(taskInfo.task);

            if (pkg.completed === pkg.total) {
                manager._debugLog('package completed: ' + taskInfo.packageId);

                pkg.deferred.resolve(pkg.tasks);
                delete manager.taskPackages[taskInfo.packageId];
            }

            var slaveIdx = _.findIndex(manager.busySlaves,
                                       function(e) { e.socket === this });
            var slave = manager.busySlaves.splice(slaveIdx, 1)[0];
            manager.idleSlaves.push(slave);
            manager._assignTasks();
        });

        socket.on('disconnect', function() {
            var idx = manager.idleSlaves.indexOf(socket);
            if (idx >= 0) {
                // idle slave disconnected - ok
                manager.idleSlaves.splice(idx, 1);
                return;
            }

            idx = manager.busySlaves.indexOf(socket);
            if (idx >= 0) {
                // busy slave disconnected - try to recover
                var slave = manager.busySlaves.splice(idx, 1);
                var task = manager.tasks[slave.taskId];
                manager.taskQueue.unshift(task);
                manager._debugLog('slave disconnected, task ' + slave.taskId
                                  + ' added at the start of task queue');
            }

            console.error('something weird happened, closed socket should be in'
                          + ' either waitingSlaves or busySlaves');
        });
    });
};

SlaveManager.prototype = {
    _debugLog: function(msg) {
        if (this.debug) {
            console.log(msg);
        }
    },
    _debugPrintStatus: function(funcName) {
        this._debugLog('slave manager: ' + funcName + ' called\n'
                       + '- ' + this.taskQueue.length + ' tasks in queue\n'
                       + '- ' + this.idleSlaves.length + ' idle slaves\n'
                       + '- ' + this.busySlaves.length + ' busy slaves');
    },
    _assignTasks: function() {
        this._debugPrintStatus('_assignTasks');

        while (this.taskQueue.length > 0 && this.idleSlaves.length > 0) {
            var slave = this.idleSlaves.shift();
            var task = this.taskQueue.shift();

            slave.taskId = task.task.id;
            slave.socket.emit('task', {
                id: slave.taskId,
                task: task.task.code,
                data: task.task.data
            });
            this.busySlaves.push(slave);

            var remote = slave.socket.handshake.address;
            this._debugLog('task ' + slave.taskId + ' assigned to '
                           + remote.address + ':' + remote.port);
        }
    },
    enqueue : function (tasks) {
        // tasks is an array of tasks mapped with toObject
        // to remove mongoose boilerplate and leave properties only

        // it should return a promise which
        // if a single task completes should emit process([ task ])
        // if all tasks complete should emit resolve([ task1, task2, ... ])
        // resolve doesn't have to send info about tasks already signalled
        // to be finished by 'process'

        if (tasks.length === 0) {
            this._debugLog('empty array passed to SlaveManager.enqueue()');

            var deferred = Q.defer();
            deferred.resolve(null);
            return deferred.promise;
        }

        var manager = this;
        var packageId = manager.taskPackageIdGenerator++;
        var deferred = Q.defer();

        manager.taskPackages[packageId] = {
            deferred: deferred,
            completed: 0, 
            total: tasks.length,
            tasks: tasks
        };

        _.forEach(tasks, function(task) {
            var taskInfo = {
                deferred: deferred,
                task: task,
                packageId: packageId
            };

            manager.tasks[task.id] = taskInfo;
            manager.taskQueue.push(taskInfo);
        });

        this._assignTasks();

        return manager.taskPackages[packageId].deferred.promise;
    },
    dequeue : function (taskIds) {
        // should return a promise
        // if it is immediately ready it should resolve it rightaway
        // if task doesn't exist or something went wrong it would be appropriate
        // to reject it with some info
        var deferred = Q.defer();
        var manager = this;

        _.async(function() {
            // TODO
        });
    }
};

module.exports = SlaveManager;
