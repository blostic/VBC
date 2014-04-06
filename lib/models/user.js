'use strict';
var job = require('./job.js');

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    crypto = require('crypto');

var authTypes = ['github', 'twitter', 'facebook', 'google'];

/**
 * User Schema
 */
var UserSchema = new Schema({
    name: {
        type: String,
        default: ''
    },
    email: {
        type: String,
        default: ''
    },
    role: {
        type: String,
        default: 'user'
    },
    jobs: [job.JobSchema],
    hashedPassword: {
        type: String,
        default: ''
    },
    provider: String,
    salt: String,
    facebook: {},
    twitter: {},
    github: {},
    google: {}
});

/**
 * Virtuals
 */
UserSchema.virtual('password').set(function(password) {
    this._password = password;
    this.salt = this.makeSalt();
    this.hashedPassword = this.encryptPassword(password);
})
    .get(function() {
        return this._password;
    });

// Basic info to identify the current authenticated user in the app
UserSchema.virtual('userInfo').get(function() {
    return {
        'name': this.name,
        'role': this.role,
        'provider': this.provider
    };
});

// Public profile information
UserSchema.virtual('profile').get(function() {
    return {
        'name': this.name,
        'role': this.role
    };
});

/**
 * Validations
 */

UserSchema.path('hashedPassword').validate(function(hashedPassword) {
    return hashedPassword.length;
}, 'Password cannot be blank!');

UserSchema.path('name').validate(function(name) {
    return name.length;
}, 'Name cannot be blank!');

UserSchema.path('email').validate(function(email) {
    return email.length;
}, 'Email cannot be blank!');

UserSchema.path('email').validate(function(email) {
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}, 'Incorrect email');

UserSchema.path('email').validate(function(value, respond) {
    var self = this;
    this.constructor.findOne({
        email: value
    }, function(err, user) {
        if (err) throw err;
        if (user) {
            if (self.id === user.id) return respond(true);
            return respond(false);
        }
        respond(true);
    });
}, 'The specified email address is already in use.');

/**
 * Methods
 */
UserSchema.methods = {
    /**
     * Authenticate - check if the passwords are the same
     *
     * @param {String} plainText
     * @return {Boolean}
     * @api public
     */
    authenticate: function(plainText) {
        return this.encryptPassword(plainText) === this.hashedPassword;
    },

    /**
     * Make salt
     *
     * @return {String}
     * @api public
     */
    makeSalt: function() {
        return crypto.randomBytes(16).toString('base64');
    },

    /**
     * Encrypt password
     *
     * @param {String} password
     * @return {String}
     * @api public
     */
    encryptPassword: function(password) {
        if (!password || !this.salt) return '';
        var salt = new Buffer(this.salt, 'base64');
        return crypto.pbkdf2Sync(password, salt, 10000, 64).toString('base64');
    }
};

module.exports = mongoose.model('User', UserSchema);
