// Include decencies
var _ = require('underscore')._;

/**
 * Room
 * @param name
 * @param namespace
 * @constructor
 */
function Room(name, namespace) {
    this.name = name;
    this.namespace = namespace;
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
    this.users.push(usr);
};

/**
 * remove a user from a user
 * @param id
 */
Room.prototype.removeUser = function (id) {

    // Returns a copy of the array with all instances of the values removed.
    var key = _.findWhere(this.users, {'id': id});
    console.log('removeUser: ' + key);

    if(!key){
        return false;
    }

    this.users = _.without(this.users, key);

    //Return new user count
    return true;

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
 * messages: {
 * {
 *      'courseid' => 0,
 *      'user_id' => 0,
 *      'fullname' => "",
 *      'roomid' => "",
 *      'message' => "",
 *      'device' => "",
 *      'ip_address' => "",
 *      'timestamp' => 0,
 * },
 * }
 *
 * @param messageObject
 */
Room.prototype.addMessage = function (messageObject, messagetype) {

    // Set message
    if (!messagetype) {
        messagetype = 'default';
    }

    messageObject.messagetype = messagetype;
    this.messageBuffer.push(messageObject);
};

Room.prototype.forwardMessagesToDBServer = function () {

    //The url we want is `www.nodejitsu.com:1337/`
    var options = {
        host  : 'www.nodejitsu.com',
        path  : '/',
        //since we are listening on a custom port, we need to specify it by hand
        port  : '80',
        //This is what changes the request to a POST request
        method: 'POST'
    };

    var callback = function (response) {

        var str = ''
        response.on('data', function (chunk) {
            str += chunk;
        });

        response.on('end', function () {
            console.log(str);
        });
    }

    var req = http.request(options, callback);

    //This is the data we are posting, it needs to be a string or a buffer
    req.write("hello world!");
    req.end();
};

module.exports = Room;
