/**
 * Created by piotr on 01.04.14.
 */
'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

/**
 * Job Schema
 */

var JobSchema = new Schema({
    creation_date: { type: Date, default: Date.now },
    status: String,
    data: Schema.Types.Mixed,
    type : String,
    result : Schema.Types.Mixed,
    owner : { type : Schema.Types.ObjectId, ref : 'User' }
});

module.exports = mongoose.model('Job', JobSchema);
