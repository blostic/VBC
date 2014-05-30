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
    //       task: Task, // contains at least: id, status, code, data, partial_result
    //       packageId: String
    // } }
    this.tasks = {};
    this.completedTasks = {};
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

    // {
    //     deferred: Q.Deferred,
    //     completedTasks: [ TaskId ],
    //     tasks: [ TaskId ]
    // }
    this.dequeuedDeferreds = [];

    this.serverSocket = io.listen(listenPort, { log: this.debug });

    var manager = this;

    this.serverSocket.on('connection', function(socket) {
        var addr = socket.handshake.address;
        manager._debugLog('slave connected: %s:%d', addr.address, addr.port);

        manager.idleSlaves.push({ socket: socket, taskId: null });
        manager._assignTasks();

        socket.on('task_reply', function(msg) {
            manager._onTaskCompleted(msg.task_id, msg.result);
        });

        socket.on('disconnect', function() {
            manager._onSlaveDisconnected(socket);
        });
    });
};

SlaveManager.prototype = {
    _debugLog: function() {
        if (this.debug) {
            console.log.apply(console.log, arguments);
        }
    },

    _debugPrintStatus: function(funcName) {
        this._debugLog('slave manager: %s called\n' +
                       '- %d tasks in queue\n' +
                       '- %d idle slaves\n' +
                       '- %d busy slaves',
                       funcName, this.taskQueue.length,
                       this.idleSlaves.length, this.busySlaves.length);
    },

    _updatePackageProgress: function(pkg, taskInfo) {
        pkg.completed++;
        pkg.deferred.notify(taskInfo.task);

        if (pkg.completed === pkg.total) {
            this._debugLog('package completed: ' + taskInfo.packageId);

            pkg.deferred.resolve(pkg.tasks);
            delete this.taskPackages[taskInfo.packageId];
        }
    },

    _markTaskAsCompleted: function(taskId, result) {
        this._debugLog('task completed: %j, result: %j', taskId, result);

        var taskInfo = this.tasks[taskId];
        if (taskInfo === undefined) {
            console.error('invalid task ID: %j', taskId);
            return;
        }

        var pkg = this.taskPackages[taskInfo.packageId];
        if (pkg === undefined) {
            console.error('task %j is assigned to invalid package %s',
                          taskId, taskInfo.packageId);
            return;
        }

        taskInfo.task.partial_result = result;
        taskInfo.task.status = 'finished';

        this._updatePackageProgress(pkg, taskInfo);
        this._updateAllDequeuedDeferreds(taskInfo.task);
    },

    _assignTasks: function() {
        this._debugPrintStatus('_assignTasks');

        while (this.taskQueue.length > 0 && this.idleSlaves.length > 0) {
            var slave = this.idleSlaves.shift();
            var taskInfo = this.taskQueue.shift();

            slave.taskId = taskInfo.task._id;
            this.busySlaves.push(slave);

            slave.socket.emit('task_request', {
                task_id: slave.taskId,
                code: taskInfo.task.code,
                data: taskInfo.task.data
            });

            taskInfo.task.status = 'executing';

            var remote = slave.socket.handshake.address;
            this._debugLog('task ' + slave.taskId + ' assigned to ' +
                           remote.address + ':' + remote.port);
        }
    },

    _reassignTask: function(taskId) {
        var taskInfo = this.tasks[taskId];

        taskInfo.task.status = 'scheduled';
        this.taskQueue.unshift(taskInfo);
        this._debugLog('slave disconnected, task ' + taskId +
                       ' added at the start of task queue');

        this._assignTasks();
    },

    _updateDequeuedDeferred: function(deferredInfo, completedTask) {
        var idx = deferredInfo.taskIds.indexOf(completedTask._id);
        var dequeuesPerTask = 0;
        if (idx >= 0) {
            deferredInfo.taskIds.splice(idx, 1);
            deferredInfo.completedTasks.push(completedTask);

            delete this.completedTasks[completedTask._id];

            if (++dequeuesPerTask > 1) {
                console.warn('warning: multiple dequeue() calls detected ' +
                             'for task %j, it may not work as expected',
                             completedTask._id);
            }
        }
    },

    _updateAllDequeuedDeferreds: function(completedTask) {
        var manager = this;

        if (completedTask === undefined) {
            for (var taskId in this.finishedTasks) {
                this._updateAllDequeuedDeferreds(this.finishedTasks[taskId].task);
            }
            return;
        }

        this._debugLog('updateAllDequeuedDeferreds: taskId = %s',
                       completedTask._id);

        _.forEach(this.dequeuedDeferreds, function(deferredInfo) {
            manager._updateDequeuedDeferred(deferredInfo, completedTask);
        });

        _.remove(this.dequeuedDeferreds, function(deferredInfo) {
            manager._debugLog('dequeuedDeferred: %d tasks completed, %d to go',
                              deferredInfo.completedTasks.length,
                              deferredInfo.taskIds.length);

            if (deferredInfo.taskIds.length === 0) {
                deferredInfo.deferred.resolve(deferredInfo.completedTasks);
                return true;
            }
            return false;
        });
    },

    _onTaskCompleted: function(taskId, result) {
        this._markTaskAsCompleted(taskId, result);

        var slaveIdx = _.findIndex(this.busySlaves,
                                   function(e) { return e.socket === this; });
        var slave = this.busySlaves.splice(slaveIdx, 1)[0];

        this.idleSlaves.push(slave);
        this._assignTasks();
    },

    _onSlaveDisconnected: function(socket) {
        var addr = socket.handshake.address;

        this._debugLog('slave %s:%d disconnected', addr.address, addr.port);

        var findBySlaveSocket = function(slave) {
            return slave.socket === socket;
        };

        var idx = _.findIndex(this.idleSlaves, findBySlaveSocket);
        if (idx >= 0) {
            // idle slave disconnected - ok
            this.idleSlaves.splice(idx, 1);
            this._debugLog('idle slave disconnected');
            return;
        }

        idx = _.findIndex(this.busySlaves, findBySlaveSocket);
        if (idx >= 0) {
            // busy slave disconnected - try to recover
            var taskId = this.busySlaves[idx].taskId;
            this.busySlaves.splice(idx, 1);
            this._reassignTask(taskId);
            return;
        }

        console.error('something weird happened, closed socket should be in' +
                      ' either waitingSlaves or busySlaves');
    },

    enqueue : function (tasks) {
        // tasks is an array of tasks mapped with toObject
        // to remove mongoose boilerplate and leave properties only

        // it should return a promise which
        // if a single task completes should emit process([ task ])
        // if all tasks complete should emit resolve([ task1, task2, ... ])
        // resolve doesn't have to send info about tasks already signalled
        // to be finished by 'process

        var deferred = Q.defer();

        if (tasks.length === 0) {
            this._debugLog('empty array passed to SlaveManager.enqueue()');

            deferred.resolve(null);
            return deferred.promise;
        }

        var manager = this;
        var packageId = manager.taskPackageIdGenerator++;

        this.taskPackages[packageId] = {
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

            manager.tasks[task._id] = taskInfo;
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
        var manager = this;
        var deferred = Q.defer();
        var deferredInfo = {
            deferred: deferred,
            completedTasks: [],
            taskIds: taskIds.slice(0) // copy
        };

        this._debugPrintStatus('dequeue');
        var unknownTasks = _.filter(
                taskIds,
                function(id) {
                    return (manager.tasks[id] === undefined) &&
                           (manager.completedTasks[id] === undefined);
                });

        if (unknownTasks.length > 0) {
            deferred.reject('invalid task IDs: ' + unknownTasks);
            return deferred.promise;
        }

        this.dequeuedDeferreds.push(deferredInfo);
        this._updateAllDequeuedDeferreds();

        return deferred.promise;
    }
};

module.exports = SlaveManager;
