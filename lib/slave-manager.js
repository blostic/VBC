'use strict';

var SlaveManager = function(argv) {
    var DEBUG = argv && !!argv.debug;
    var LISTEN_PORT = argv && argv.listenPort || 9001;

    var io = require('socket.io'),
        _ = require('lodash'),
        Q = require('q');

    var _debugLog = function() {
        if (DEBUG) {
            console.log.apply(console.log, arguments);
        }
    }

    var Slave = function(socket) {
        /* io.Socket */ this.socket = socket;
        /* TaskId */    this.taskId = null;
    }

    Slave.prototype = {
        assignTask: function(taskInfo) {
            this.taskId = taskInfo.id;

            taskInfo.executionStarted();
            this.socket.emit('task_request', {
                task_id: taskInfo.id,
                code: taskInfo.task.code,
                data: taskInfo.task.data
            });
        },

        getAddressString: function() {
            return this.socket.handshake.address.address + ':' +
                   this.socket.handshake.address.port;
        }
    };

    var TaskInfo = function(task, packageId, deferred) {
        /* TaskId */     this.id = task._id;
        /* Task */       this.task = task;
        /* Number */     this.packageId = packageId;
        /* Q.Deferred */ this.deferred = deferred;
    }

    TaskInfo.prototype = {
        reset: function() {
            this.task.status = 'scheduled';
        },
        executionStarted: function() {
            this.task.status = 'executing';
        },
        resolve: function(result) {
            this.task.partial_result = result;
            this.task.status = 'finished';
        }
    };

    var Package = function(id, tasks) {
        /* Number */     this.id = id;
        /* Task[] */     this.tasks = tasks;
        /* Number */     this.completedTasks = 0;
        /* Number */     this.totalTasks = tasks.length;
        /* Q.Deferred */ this.deferred = Q.defer();
    }

    Package.prototype = {
        progress: function(taskInfo, result) {
            taskInfo.resolve(result);

            this.completedTasks++;
            this.deferred.notify(taskInfo.task);

            _debugLog("completed: %d/%d", this.completedTasks, this.totalTasks);
            if (this.completedTasks === this.totalTasks) {
                _debugLog('package completed: ' + taskInfo.packageId);
                this.deferred.resolve(this.tasks);
            }
        },

        isCompleted: function() {
            return this.completedTasks === this.totalTasks;
        }
    };

    var PackageDeferred = function(taskIds, deferred) {
        /* TaskId[] */   this.unresolvedTaskIds = taskIds;
        /* Task[] */     this.completedTasks = [];
        /* Q.Deferred */ this.deferred = deferred;
    }

    PackageDeferred.prototype = {
        containsTaskId: function(id) {
            return this.unresolvedTaskIds.indexOf(id) !== -1;
        },

        onTaskCompleted: function(task) {
            var idx = this.unresolvedTaskIds.indexOf(task._id);

            if (idx >= 0) {
                _debugLog('dequeuedDeferred: %d tasks completed, %d to go',
                          this.completedTasks.length,
                          this.unresolvedTaskIds.length);

                this.unresolvedTaskIds.splice(idx, 1);
                this.completedTasks.push(task);

                if (this.isResolved()) {
                    this.deferred.resolve(this.completedTasks);
                }
            }
        },
        
        isResolved: function() {
            return this.unresolvedTaskIds.length === 0;
        }
    };

    var SlaveManager = function (listenPort, debug) {
        this.debug = !!debug;

        // WebSockets to slaves who are not processing anything
        /* Slave[] */               this.idleSlaves = [];
        /* Slave[] */               this.busySlaves = [];

        /* { Id => TaskInfo } */    this.tasks = {};
        /* { Id => TaskInfo } */    this.completedTasks = {};
        /* TaskInfo[] */            this.taskQueue = []; // tasks from this.tasks

        /* { Number => Package } */ this.taskPackages = {};
        /* Number */                this.taskPackageIdGenerator = 0;

        /* PackageDeferred[] */     this.dequeuedDeferreds = [];

        this.serverSocket = io.listen(listenPort, { log: this.debug });

        var manager = this;

        this.serverSocket.on('connection', function(socket) {
            var addr = socket.handshake.address;
            _debugLog('slave connected: %s:%d', addr.address, addr.port);

            manager.idleSlaves.push(new Slave(socket));
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
        _debugPrintStatus: function(funcName) {
            _debugLog('slave manager: %s called\n' +
                      '- %d tasks in queue\n' +
                      '- %d idle slaves\n' +
                      '- %d busy slaves',
                      funcName, this.taskQueue.length,
                      this.idleSlaves.length, this.busySlaves.length);
        },

        _markTaskAsCompleted: function(taskId, result) {
            _debugLog('task completed: %j, result: %j', taskId, result);

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

            pkg.progress(taskInfo, result);
            if (pkg.isCompleted()) {
                delete this.taskPackages[pkg.id];
            }

            this._updateAllDequeuedDeferreds(taskInfo.task);
        },

        _assignTasks: function() {
            this._debugPrintStatus('_assignTasks');

            while (this.taskQueue.length > 0 && this.idleSlaves.length > 0) {
                var slave = this.idleSlaves.shift();
                var taskInfo = this.taskQueue.shift();

                this.busySlaves.push(slave);
                slave.assignTask(taskInfo);

                _debugLog('task ' + slave.taskId + ' assigned to ' +
                          slave.getAddressString());
            }
        },

        _reassignTask: function(taskId) {
            var taskInfo = this.tasks[taskId];

            taskInfo.reset();
            this.taskQueue.unshift(taskInfo);
            _debugLog('slave disconnected, task ' + taskId +
                      ' added at the start of task queue');

            this._assignTasks();
        },

        _notifyDequeuedDeferreds: function(completedTask) {
            var dequeuesPerTask = 0;
            var manager = this;

            _.forEach(this.dequeuedDeferreds, function(pkgDeferred) {
                if (pkgDeferred.containsTaskId(completedTask._id)) {
                    pkgDeferred.onTaskCompleted(completedTask);
                    delete manager.completedTasks[completedTask._id];

                    if (++dequeuesPerTask > 1) {
                        console.warn('warning: multiple dequeue() calls detected ' +
                                     'for task %j, it may not work as expected',
                                     completedTask._id);
                    }
                }
            });
        },

        _updateAllDequeuedDeferreds: function(completedTask) {
            var manager = this;

            if (completedTask === undefined) {
                for (var id in this.completedTasks) {
                    this._updateAllDequeuedDeferreds(this.completedTasks[id].task);
                }
                return;
            }

            _debugLog('updateAllDequeuedDeferreds: taskId = %s',
                      completedTask._id);
            this._notifyDequeuedDeferreds(completedTask);

            _.remove(this.dequeuedDeferreds, function(pkgDeferred) {
                return pkgDeferred.isResolved();
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

            _debugLog('slave %s:%d disconnected', addr.address, addr.port);

            var findBySlaveSocket = function(slave) {
                return slave.socket === socket;
            };

            var idx = _.findIndex(this.idleSlaves, findBySlaveSocket);
            if (idx >= 0) {
                // idle slave disconnected - ok
                this.idleSlaves.splice(idx, 1);
                _debugLog('idle slave disconnected');
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
                _debugLog('empty array passed to SlaveManager.enqueue()');

                deferred.resolve(null);
                return deferred.promise;
            }

            var manager = this;
            var pkg = new Package(manager.taskPackageIdGenerator++, tasks);
            this.taskPackages[pkg.id] = pkg;

            _.forEach(tasks, function(task) {
                var taskInfo = new TaskInfo(task, pkg.id, deferred);
                manager.tasks[taskInfo.id] = taskInfo;
                manager.taskQueue.push(taskInfo);
            });

            this._assignTasks();

            return pkg.deferred.promise;
        },
        dequeue : function (taskIds) {
            // should return a promise
            // if it is immediately ready it should resolve it rightaway
            // if task doesn't exist or something went wrong it would be
            // appropriate to reject it with some info
            var manager = this;
            var deferred = Q.defer();
            var pkgDeferred = new PackageDeferred(taskIds, deferred);

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

            this.dequeuedDeferreds.push(pkgDeferred);
            this._updateAllDequeuedDeferreds();

            return deferred.promise;
        }
    };

    return new SlaveManager(LISTEN_PORT);
}

module.exports = SlaveManager;
