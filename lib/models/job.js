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
    partial_result: [Schema.Types.Mixed]
});

/**
 * Job Schema
 */

var JobSchema = new Schema({
    creation_date: { type: Date, default: Date.now },
    status: String,
    code: String,
    tasks: [TaskSchema]
});
