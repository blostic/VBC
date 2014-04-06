'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
/**
 * Task Schema
 */

var TaskSchema = new Schema({
    status: String,
    data: Schema.Types.Mixed,
    partial_result: Schema.Types.Mixed,
    code : String,
    job : { type : Schema.Types.ObjectId, ref : "Job" }
});

module.exports = mongoose.model('Task', TaskSchema);

