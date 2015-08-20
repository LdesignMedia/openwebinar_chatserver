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
    this.broadcaster_identifier = "";
    this.callback = callback;
    this.users = [];
    this.messageBuffer = [];

    var that    = this, // reference needed for callback
        options = {
            url    : callback + '?action=broadcastinfo',
            method : "POST",
            json   : {
                'shared_secret': shared_secret,
                'broadcastkey' : name
            },
            headers: {
                'Content-Type': 'application/json'
            }
        };

    // query the broadcast identifier for validation
    // send request
    request(options, function (error, response, body) {
        if (!error) {
            var info = JSON.parse(JSON.stringify(body));
            if (info.status === true) {
                that.broadcaster_identifier = info.webcast.broadcaster_identifier;
            }
        }
        else {
            console.log('Error happened: ' + error);
        }
    });
}

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
};

/**
 * Validate the broadcaster_identifier
 * @param chatobject
 * @returns {boolean}
 */
Room.prototype.validateBroadcasterIdentifier = function (chatobject) {
    console.log(this.broadcaster_identifier);
    return (chatobject.broadcaster_identifier !== "" && this.broadcaster_identifier === chatobject.broadcaster_identifier);
};

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
};

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

/**
 * Remove messages from the buffer that already been send to DB server
 * @param size int
 */
Room.prototype.updateBufferSize = function (size) {
    this.messageBuffer.splice(0, size);
};

/**
 * Send messages to a DB server to have a chat history
 */
Room.prototype.forwardMessagesToDBServer = function (bufferSendCallBack) {
    var that = this; // reference needed for callback
    var buffer = _.clone(this.messageBuffer);

    console.log(this.callback + '?action=chatlog');

    var options = {
        url    : this.callback + '?action=chatlog',
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

            // save status of the buffer
            if(typeof bufferSendCallBack === 'function'){
                bufferSendCallBack();
            }
        }
        else {
            console.log('Error happened: ' + error);
        }
    });
};

module.exports = Room;
