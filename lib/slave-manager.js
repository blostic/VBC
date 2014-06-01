'use strict';

/**
 * Slave Manager manages all slave connections and dispatches received tasks.
 * It makes sure all tasks are executed at some point of time, even if some
 * connections are lost.
 *
 * It exposes two methods: enqueue() and dequeue(), which are used by the
 * scheduler.
 *
 * @constructor
 * @param argv {Object} config dictionary. It may contain:
 *                      - debug {bool} - flag that enables debug logs
 *                      - listenPort {Number} - the port to listen for incoming
 *                                              slave connections.
 */
var SlaveManager = function(argv) {
    var DEBUG = argv && !!argv.debug;
    var LISTEN_PORT = argv && argv.listenPort || 9001;

    var io = require('socket.io'),
        _ = require('lodash'),
        Q = require('q');

    /**
     * Forwards its arguments to console.log only if DEBUG flag is set.
     */
    var _debugLog = function() {
        if (DEBUG) {
            console.log.apply(console.log, arguments);
        }
    };

    /**
     * Finds the index of first Slave in given array that uses given socket.
     *
     * @param slaves {Array[Slave]} - array of Slave objects to search.
     * @param socket {io.Socket} - a socket to search for.
     * @returns the index of Slave using given socket, or -1.
     */
    var findSlaveIndexBySocket = function(slaves, socket) {
        return _.findIndex(slaves, function(s) { return s.socket === socket; });
    };

    /**
     * A class that matches a socket to id of the task it currently executes.
     *
     * @class Scheduler
     * @constructor
     * @param socket {io.Socket} slave socket.
     */
    var Slave = function(socket) {
        /* io.Socket */ this.socket = socket;
        /* TaskId */    this.taskId = null;
    };

    Slave.prototype = {
        /**
         * Assigns a task described by given TaskInfo object to the Slave.
         *
         * @method assignTask
         * @param taskInfo {TaskInfo} task details.
         */
        assignTask: function(taskInfo) {
            this.taskId = taskInfo ? taskInfo.id : null;

            if (this.taskId !== null) {
                taskInfo.executionStarted();
                this.socket.emit('task_request', {
                    task_id: taskInfo.id,
                    code: taskInfo.task.code,
                    data: taskInfo.task.data
                });
            }
        },

        /**
         * Returns the slave address in a host:port format.
         *
         * @method getAddressString
         * @returns slave address, as "host:port"
         */
        getAddressString: function() {
            return this.socket.handshake.address.address + ':' +
                   this.socket.handshake.address.port;
        }
    };

    /**
     * Scheduled task details.
     *
     * @class TaskInfo
     * @constructor
     * @param task {Task} a task object to wrap.
     * @param packageId {Number} id of the Package that contains this task.
     * @param deferred {Q.Deferred} Deferred object of the Package mentioned
     *                              above.
     */
    var TaskInfo = function(task, packageId, deferred) {
        /* TaskId */     this.id = task._id;
        /* Task */       this.task = task;
        /* Number */     this.packageId = packageId;
        /* Q.Deferred */ this.deferred = deferred;
    };

    TaskInfo.prototype = {
        reset: function() {
            this.task.status = 'scheduled';
        },
        executionStarted: function() {
            this.task.status = 'executing';
        },

        /**
         * Marks the task as resolved and stores the calculated result.
         *
         * @method resolve
         * @param result {Object} task result.
         */
        resolve: function(result) {
            this.task.partial_result = result;
            this.task.status = 'finished';
        }
    };

    /**
     * A collection of tasks passed to a single SlaveManager.enqueue() call.
     *
     * @class Package
     * @constructor
     * @param id {Number} arbitrary package id.
     * @param tasks {Array[Task]} an array of Task objects from the enqueue()
     *                            call.
     */
    var Package = function(id, tasks) {
        /* Number */     this.id = id;
        /* Task[] */     this.tasks = tasks;
        /* Number */     this.completedTasks = 0;
        /* Number */     this.totalTasks = tasks.length;
        /* Q.Deferred */ this.deferred = Q.defer();
    };

    Package.prototype = {
        /**
         * Updates the Package state by marking one of its Tasks as resolved.
         *
         * @method progress
         * @param taskInfo {TaskInfo} the TaskInfo of completed task.
         * @param result {Object} task result.
         */
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

        /**
         * Chacks if all tasks from this Package are completed.
         *
         * @method isCompleted
         * @returns true if all tasks were completed.
         */
        isCompleted: function() {
            return this.completedTasks === this.totalTasks;
        }
    };

    /**
     * A wrapper around the Deferred object for a Task set which was already
     * dequeued.
     *
     * @class PackageDeferred
     * @constructor
     * @param taskIds {Array[TaskId]} array of dequeued TaskIds.
     * @param deferred {Q.Deferred} a Deferred object for tracking the taskIds
     *                              completion progress.
     */
    var PackageDeferred = function(taskIds, deferred) {
        /* TaskId[] */   this.unresolvedTaskIds = taskIds;
        /* Task[] */     this.completedTasks = [];
        /* Q.Deferred */ this.deferred = deferred;
    };

    PackageDeferred.prototype = {
        containsTaskId: function(id) {
            return this.unresolvedTaskIds.indexOf(id) !== -1;
        },

        /**
         * Updates the PackageDeferred object after completion of a Task.
         *
         * @method onTaskCompleted
         * @param task {Task} the task that was just completed.
         */
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

    /**
     * Actual SlaveManager class implementation.
     *
     * @class SlaveManager
     * @constructor
     * @param listenPort {Number} - a port to listen for slave connections on.
     */
    var SlaveManager = function (listenPort) {
        /* Slaves who are not processing anything */
        /* Slave[] */               this.idleSlaves = [];
        /* Slaves busy executing assigned tasks */
        /* Slave[] */               this.busySlaves = [];

        /* all tasks passed to the SlaveManager */
        /* { Id => TaskInfo } */    this.tasks = {};
        /* subset of this.tasks - ones that were already completed */
        /* { Id => TaskInfo } */    this.completedTasks = {};
        /* queue of tasks yet to be executed */
        /* TaskInfo[] */            this.taskQueue = [];

        /* Packages created by enqueue() calls, waiting for execution */
        /* { Number => Package } */ this.taskPackages = {};
        /* Used for generating unique Package ids */
        /* Number */                this.taskPackageIdGenerator = 0;

        /* A set of PackageDeferreds waiting for completion of some tasks */
        /* PackageDeferred[] */     this.dequeuedDeferreds = [];

        /* A server socket listening for incoming slave connections */
        /* io.Socket */ this.serverSocket = io.listen(listenPort,
                                                      { log: this.debug });

        var manager = this;

        this.serverSocket.on('connection', function(socket) {
            var addr = socket.handshake.address;
            _debugLog('slave connected: %s:%d', addr.address, addr.port);

            manager.idleSlaves.push(new Slave(socket));
            manager._assignTasks();

            socket.on('task_reply', function(msg) {
                manager._onTaskCompleted(this, msg.task_id, msg.result);
            });

            socket.on('disconnect', function() {
                manager._onSlaveDisconnected(socket);
            });
        });
    };

    SlaveManager.prototype = {
        /**
         * Internal function used for SlaveManager debugging.
         */
        _debugPrintStatus: function(funcName) {
            _debugLog('slave manager: %s called\n' +
                      '- %d tasks in queue\n' +
                      '- %d idle slaves\n' +
                      '- %d busy slaves',
                      funcName, this.taskQueue.length,
                      this.idleSlaves.length, this.busySlaves.length);
        },

        /**
         * Updates all objects waiting for completion of given Task.
         *
         * @param taskId {TaskId} id of the completed task.
         * @param result {Object} task execution result.
         */
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

            this._updateAllDequeued(taskInfo.task);
        },

        /**
         * Assigns pending tasks to idle slaves.
         */
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

        /**
         * Puts given task back to the task queue after the slave unexpectedly
         * disconnects while executing a task and attempts to assign it to
         * someone else.
         *
         * @param taskId {TaskId} id of the task to reassign.
         */
        _reassignTask: function(taskId) {
            var taskInfo = this.tasks[taskId];

            taskInfo.reset();
            this.taskQueue.unshift(taskInfo);
            _debugLog('slave disconnected, task ' + taskId +
                      ' added at the start of task queue');

            this._assignTasks();
        },

        /**
         * Notifies the PackageDeferred objects after a task completion.
         *
         * @param completedTask {Task} completed task.
         */
        _notifyDequeued: function(completedTask) {
            var dequeuesPerTask = 0;
            var manager = this;

            _.forEach(this.dequeuedDeferreds, function(pkgDeferred) {
                if (pkgDeferred.containsTaskId(completedTask._id)) {
                    pkgDeferred.onTaskCompleted(completedTask);
                    delete manager.completedTasks[completedTask._id];

                    if (++dequeuesPerTask > 1) {
                        console.warn('warning: multiple dequeue() calls ' +
                                     'detected for task %j, it may not work ' +
                                     'as expected', completedTask._id);
                    }
                }
            });
        },

        /**
         * Updates PackageDeferred object(s) after a task completion.
         *
         * @param completedTask {TaskId} - completed task id. If this value is
         *                                 undefined, the function triggers
         *                                 updates for all completed tasks.
         */
        _updateAllDequeued: function(completedTask) {
            var manager = this;

            if (completedTask === undefined) {
                for (var id in this.completedTasks) {
                    this._updateAllDequeued(this.completedTasks[id].task);
                }
                return;
            }

            _debugLog('updateAllDequeuedDeferreds: taskId = %s',
                      completedTask._id);
            this._notifyDequeued(completedTask);

            _.remove(this.dequeued, function(pkgDeferred) {
                return pkgDeferred.isResolved();
            });
        },

        /**
         * A handler called when a slave finished executing the task.
         *
         * @param socket {io.Socket} a socket that received the task result.
         * @param taskId {TaskId} id of the completed task.
         * @param result {Object} task result.
         */
        _onTaskCompleted: function(socket, taskId, result) {
            this._markTaskAsCompleted(taskId, result);

            var slaveIdx = findSlaveIndexBySocket(this.busySlaves, socket);
            var slave = this.busySlaves.splice(slaveIdx, 1)[0];
            slave.assignTask(null);

            this.idleSlaves.push(slave);
            this._assignTasks();
        },

        /**
         * A handler called when the slave connection has been lost.
         *
         * @param socket {io.Socket} the socket that lost connection.
         */
        _onSlaveDisconnected: function(socket) {
            var addr = socket.handshake.address;

            _debugLog('slave %s:%d disconnected', addr.address, addr.port);

            var idx = findSlaveIndexBySocket(this.idleSlaves, socket);
            if (idx >= 0) {
                // idle slave disconnected - ok
                this.idleSlaves.splice(idx, 1);
                _debugLog('idle slave disconnected');
                return;
            }

            idx = findSlaveIndexBySocket(this.busySlaves, socket);
            if (idx >= 0) {
                // busy slave disconnected - try to recover
                var taskId = this.busySlaves[idx].taskId;
                this.busySlaves.splice(idx, 1);
                this._reassignTask(taskId);
                return;
            }

            console.error('something weird happened, closed socket should be ' +
                          'in either waitingSlaves or busySlaves');
        },

        /**
         * Schedules execution of given tasks.
         *
         * @method enqueue
         * @param tasks {Array[Task]} an array of tasks mapped with toObject to
         *                            remove mongoose boilerplate and leave
         *                            properties only
         *
         * @returns {Q.Promise} a promise which:
         *                      - if a single task completes, emits
         *                        process([ task ]),
         *                      - if all tasks completes, emits
         *                        resolve([ task1, task2, ... ]) with all
         *                        enqueued tasks.
         */
        enqueue : function (tasks) {
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

        /**
         * Returns a Q.Promise that resolves after all given tasks are
         * completed.
         *
         * @method dequeue
         * @param taskIds {Array[TaskId]} list of TaskIds to wait for.
         *
         * @returns {Q.Promise} a promise which resolves after all taskIds are
         *                      completed.
         */
        dequeue : function (taskIds) {
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
            this._updateAllDequeued();

            return deferred.promise;
        }
    };

    return new SlaveManager(LISTEN_PORT);
};

module.exports = SlaveManager;
