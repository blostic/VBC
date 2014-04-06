/**
 * Created by piotr on 01.04.14.
 */
'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

/**
 * Task Schema
 */

var TaskSchema = new Schema({
    status: String,
    data: Schema.Types.Mixed,
    partialResult: Schema.Types.Mixed
});

/**
 * Job Schema
 */

var JobSchema = new Schema({
    creationDate: { type: Date, default: Date.now },
    status: String,
    data: Schema.Types.Mixed,
    code: String,
    result : Schema.Types.Mixed,
    tasks: [TaskSchema]
});

module.exports = {
    Job : mongoose.model('Job', JobSchema),
    Task : mongoose.model('Task', TaskSchema)
};
