// Include decencies
var _ = require('underscore')._;
// Caja's stand-alone HTML sanitizer for node
var sanitizer = require('caja-sanitizer');
// Send request
var request = require('request');

// Useragent parser
var userAgentParser = require('ua-parser-js');
/**
 * Room
 * @param name
 * @param namespace
 * @constructor
 */
function Room(name, namespace, callback, shared_secret) {
    this.name = name;
    this.namespace = namespace;
    this.shared_secret = shared_secret;
    this.mute_guest = true;
    this.mute_student = false;
    this.mute_teacher = false;
    this.callback = callback;
    this.users = [];
    this.messageBuffer = [];
};

/**
 * Add a user to a room
 * @param chatobject
 */
Room.prototype.addUser = function (chatobject) {

    var usr = _.clone(chatobject);
    delete usr.broadcastkey;
    delete usr.hostname;
    delete usr.courseid;
    delete usr.cmid;
    delete usr.webcastid;
    delete usr.shared_secret;
    delete usr.message;

    // convert useragent to something more usable
    usr.useragent = userAgentParser(usr.useragent);
    console.log(usr.useragent);
    this.users.push(usr);
};

/**
 * Mute a user for typing
 * @param userType
 * @param value
 * @returns {*}
 */
Room.prototype.setMute = function (userType, value) {

    switch (userType) {
        case 'guest':
            this.mute_guest = Boolean(value);
            return this.mute_guest;

        case 'student':
            this.mute_student = Boolean(value);
            return this.mute_student;

        case 'teacher':
            this.mute_teacher = Boolean(value);
            return this.mute_teacher;
    }
    return null;
}

/**
 * Check if a user can type
 * @param chatobject
 * @returns boolean
 */
Room.prototype.canType = function (chatobject) {

    switch (chatobject.usertype) {
        case 'broadcaster':
            // can always send messages
            return true;

        case 'guest':
            return !this.mute_guest;

        case 'student':
            return !this.mute_student;

        case 'teacher':
            return !this.mute_teacher;
    }

    return false;
}

/**
 * remove a user from a user
 * @param id
 */
Room.prototype.removeUser = function (id) {

    // Returns a copy of the array with all instances of the values removed.
    var key = _.findWhere(this.users, {'id': id});
    console.log('removeUser: ' + key);

    if (!key) {
        return false;
    }

    this.users = _.without(this.users, key);

    //Return new user count
    return true;

};

/**
 * Messages in the buffer
 * return int
 */
Room.prototype.getMessagesCount = function () {
    console.log('getMessagesCount ' + this.name);
    return _.size(this.messageBuffer);
};

/**
 * Users in this room
 * return int
 */
Room.prototype.getUserCount = function () {
    console.log('getUserCount ' + this.name);
    return _.size(this.users);
};

/**
 * cleanup
 */
Room.prototype.cleanup = function () {
    console.log('@todo send data to callback server');

};

/**
 * Return all users
 * return array
 */
Room.prototype.getAllUsers = function () {
    // @todo maybe some parsing not everything need to be send to clients
    return this.users;
};

/**
 * messageObject
 * @param messageObject
 */
Room.prototype.addMessage = function (messageObject, messagetype) {

    // Set message
    if (!messagetype) {
        messagetype = 'default';
    }
    var msg = _.clone(messageObject);
    msg.messagetype = messagetype;

    delete msg.broadcastkey;
    delete msg.hostname;
    delete msg.courseid;
    delete msg.cmid;
    delete msg.webcastid;
    delete msg.shared_secret;

    // Cleanup the string for save usage
    msg.message = sanitizer.sanitize(msg.message);
    msg.timestamp = Math.round(new Date().getTime() / 1000);
    this.messageBuffer.push(msg);
    return msg;
};

Room.prototype.updateBufferSize = function (size) {
    this.messageBuffer.splice(0, size);
}

Room.prototype.forwardMessagesToDBServer = function () {
    var that = this; // reference needed for callback
    var buffer = _.clone(this.messageBuffer);

    var options = {
        url    : this.callback,
        method : "POST",
        json   : {
            'messages'     : buffer,
            'shared_secret': this.shared_secret,
            'broadcastkey' : this.name
        },
        headers: {
            'Content-Type': 'application/json'
        }
    };

    //send request
    request(options, function (error, response, body) {
        if (!error) {
            var info = JSON.parse(JSON.stringify(body));

            if (info.status === true) {
                console.log('Server has saved the messages we can remove them!');
                that.updateBufferSize(buffer.length);
            }

            console.log(info);
        }
        else {
            console.log('Error happened: ' + error);
        }
    });
};

module.exports = Room;
