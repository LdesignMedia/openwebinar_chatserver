/**
 * Moodlefreak Chat Server v.0.3
 *
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 *
 * @package   moodlefreak-chat
 * @copyright 2015 MoodleFreak.com
 * @author    Luuk Verhoeven
 **/

// Includes
var config = require('./config');
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require("socket.io")(server);

// Rigorous implementation of RFC4122 (v1 and v4) UUIDs.
var uuid = require('node-uuid');

// JavaScript's functional programming helper library.
var _ = require('underscore')._;

// Caja's stand-alone HTML sanitizer for node
var Util = require('./util.js')();
var Room = require('./room.js');

// Start server
server.listen(config.port, function () {
    console.log('Server listening at port %d', config.port);
});

// Data Holders
var rooms = {};
var sockets = [];
var buffersendonexit = false;

io.on('connection', function (client) {
    var address = client.handshake.address;
    console.log("New connection from " + address);
});

function join(socket, chatobject, fn) {

    console.log("join");
    console.log(chatobject);

    // validate key/host
    var valid = Util.validToken(chatobject.shared_secret, chatobject.hostname);
    if (!valid.status) {
        console.log(valid.error);
        fn(valid);
        return;
    }

    // We can continue
    chatobject.id = socket.id;
    socket.has_access = true;
    socket.namespace = valid.namespace;

    // Check if the roomnamespace is set
    if (rooms[socket.namespace] === undefined) {
        rooms[socket.namespace] = [];
    }

    // Use namespace to allow more environment to connect
    var roomname = Util.getRoomNameFromChatobject(chatobject);
    if (rooms[socket.namespace][roomname] === undefined) {
        rooms[socket.namespace][roomname] = new Room(roomname, socket.namespace, valid.callback, chatobject.shared_secret);
    }

    // Reference
    var room = rooms[socket.namespace][roomname];
    room.addUser(chatobject);

    // Join the room
    socket.join(roomname).in(socket.namespace);

    // Only send userlist update to correct room
    io.sockets.in(roomname).emit("update-user-list", {
        users : room.getAllUsers(),
        count : room.getUserCount(),
        status: true
    });

    // Add the socket to a container
    sockets.push(socket);

    fn({'status': true});
}

/**
 * Validate the call and return a room object
 *
 * @param {object} socket
 * @param {object} chatobject
 * @param {function} fn
 * @returns {Room|boolean}
 */
function validAccessAndReturnRoom(socket, chatobject, fn) {

    if (!socket.has_access || socket.namespace === "") {

        // Maybe got disconnected???
        join(socket, chatobject, fn);

        // Stop invalid calls
        if (!socket.has_access) {
            return false;
        }
    }

    var roomname = Util.getRoomNameFromChatobject(chatobject);
    if (rooms[socket.namespace][roomname] !== undefined) {
        console.log('Found Room()');
        return rooms[socket.namespace][roomname];
    }
    return false;
}

/**
 * Send the chat message buffers to the server
 * Note: this also executed on error / termination
 */
function sendBuffersAndCleaning(bufferSend) {
    console.log('Send Buffers');
    // loop
    for (var namespace in rooms) {
        if (rooms.hasOwnProperty(namespace)) {
            for (var roomname in rooms[namespace]) {
                console.log('Roomname: ' + roomname);
                var room = rooms[namespace][roomname];
                var count = room.getMessagesCount();
                console.log('Messages: ' + count);

                if (count > 0) {
                    // send to a server
                    room.forwardMessagesToDBServer(bufferSend);
                }

                if (room.getUserCount() == 0) {
                    console.log('Delete room');
                    delete rooms[namespace][roomname];
                }
            }
        }
    }
    console.log('Buffers loop end');
}

function bufferSend() {
    console.log('buffersendonexit = true');
    buffersendonexit = true;
}

io.sockets.on("connection", function (socket) {

    // Set some defaults
    socket.has_access = false;
    socket.namespace = "";

    /**
     * Join the chatroom
     */
    socket.on("join", function (chatobject, fn) {
        join(socket, chatobject, fn);
    });

    /**
     * End the openwebinar & unload/remove the room from chat server
     */
    socket.on("ending", function (chatobject, fn) {
        var room = validAccessAndReturnRoom(socket, chatobject, fn);
        if (typeof room === 'object') {
            if (chatobject.usertype === 'broadcaster' && room.validateBroadcasterIdentifier(chatobject)) {
                console.log('OK');
                // only the broadcaster can do this
                io.sockets.in(room.name).emit("openwebinar-ended", {
                    status: true
                });

                var count = room.getMessagesCount();
                console.log('Messages: ' + count);

                if (count > 0) {
                    // send to a server
                    room.forwardMessagesToDBServer();
                }

                fn({status: true});
                return;
            }
        }
        fn({status: false});
    });

    /**
     * Get the latest userlist in from the room
     */
    socket.on("get-userlist", function (chatobject, fn) {
        var room = validAccessAndReturnRoom(socket, chatobject, fn);
        if (typeof room === 'object') {
            fn({
                status: true,
                users : room.getAllUsers(),
                count : room.getUserCount()
            });
            return;
        }
        fn({status: false});
    });

    /**
     * Mute a usertype
     */
    socket.on("mute", function (chatobject, mute_usertype, value, fn) {
        console.log('mute');
        var room = validAccessAndReturnRoom(socket, chatobject, fn);
        if (typeof room === 'object') {
            if (chatobject.usertype === 'broadcaster' && room.validateBroadcasterIdentifier(chatobject)) {
                console.log('OK');
                fn({
                    status: true,
                    mute  : room.setMute(mute_usertype, value)
                });

                return;
            } else {
                console.log('error: your_not_a_broadcaster ' + chatobject.broadcaster_identifier + ' usertype:' + chatobject.usertype);
                fn({
                    status : false,
                    'error': 'your_not_a_broadcaster'
                });

                return;
            }
        }

        fn({status: false});
    });

    /**
     * Send a chat message to the room clients
     */
    socket.on("send", function (chatobject, fn) {

        var room = validAccessAndReturnRoom(socket, chatobject, fn);
        console.log(typeof room);
        if (typeof room === 'object') {
            console.log('valid room');

            if (!room.canType(chatobject)) {
                fn({
                    'status': false,
                    'error' : 'muted'
                });
                return;
            }

            // Send to clients
            io.sockets.in(room.name).emit("update-chat", room.addMessage(chatobject));

            fn({'status': true});

        } else {
            console.log('unknown_room');
            fn({
                'status': false,
                'error' : 'unknown_room'
            });
        }
    });

    /**
     * Client disconnect
     */
    socket.on("disconnect", function () {
        console.log("disconnect");

        // Remove this user from all possible rooms
        for (var roomname in rooms[socket.namespace]) {
            var room = rooms[socket.namespace][roomname];
            if (room.removeUser(socket.id)) {

                if (room.getUserCount() == 0) {
                    console.log('Nobody in the room anymore.. we should delete the room');

                    // cleanup prevent empty rooms
                    var count = room.getMessagesCount();
                    console.log('Messages: ' + count);

                    if (count > 0) {
                        // send to a server
                        room.forwardMessagesToDBServer();
                    }

                    console.log('Delete room');
                    delete rooms[socket.namespace][roomname];
                }

                console.log('update-user-list');
                io.sockets.in(roomname).emit("update-user-list", {
                    users : room.getAllUsers(),
                    count : room.getUserCount(),
                    status: true
                });

            } else {
                console.log('You are not in this room!');
            }
        }

        // Remove from the sockets
        // @todo check if we can do without it
        var o = _.findWhere(sockets, {'id': socket.id});
        sockets = _.without(sockets, o);
    });
});

// Send the room buffers to DB servers
var intervalCron = setInterval(function () {
    console.log('Cron check buffers');
    sendBuffersAndCleaning(false);
}, 60000); // 1 minute

// so the program will not close instantly
process.stdin.resume();

/**
 * Execute on error or termination
 *
 * @param options
 * @param err
 */
function exitHandler(options, err) {

    var i = 0;

    try {
        // stop the cron
        clearInterval(intervalCron);
    } catch (e) {

    }

    if (err) {
        // log real errors to console
        console.log(err.stack);
    }

    if (options.exit && buffersendonexit === false) {
        buffersendonexit = 0;

        // Send chat logs DB servers before we exit
        sendBuffersAndCleaning(bufferSend);

        // delay exit for posting to the DB servers
        setInterval(function () {
            console.log('.' + i);

            if (buffersendonexit === true || i == 20) {
                // the real exit
                process.exit();
            }

            i++;
        }, 500);
    }
}

//do something when app is closing
process.on('exit', exitHandler.bind(null, {exit: true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit: true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit: true}));
