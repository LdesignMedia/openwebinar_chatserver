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
 * @param socket
 * @param chatobject
 * @param fn
 * @returns Room|false
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
     * End the webcast & unload/remove the room from chat server
     */
    socket.on("ending", function (chatobject, fn) {
        var room = validAccessAndReturnRoom(socket, chatobject, fn);
        if (typeof room === 'object') {
            if (chatobject.usertype === 'broadcaster' && room.validateBroadcasterIdentifier(chatobject)) {
                console.log('OK');
                // only the broadcaster can do this
                io.sockets.in(room.name).emit("webcast-ended", {
                    status: true
                });

                var count = room.getMessagesCount();
                console.log('Messages: ' + count);

                if (count > 0) {
                    // send to a server
                    room.forwardMessagesToDBServer();
                }
                delete room;

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
                console.log('error: your_not_a_broadcaster ' + chatobject.broadcaster_identifier);
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
                    console.log('Nobody in the room anymore.. we should cleanup');
                    room.cleanup();
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
var interval = setInterval(function () {
    console.log('Cron check buffers');

    // Loop
    for (var namespace in rooms) {
        console.log(namespace);
        for (var roomname in rooms[namespace]) {
            console.log(roomname);

            var room = rooms[namespace][roomname];
            var count = room.getMessagesCount();
            console.log('Messages: ' + count);

            if (count > 0) {
                // send to a server
                room.forwardMessagesToDBServer();
            }
        }
    }

}, 60000); // 1 minute

// @todo On failure clear buffers

// @todo On close clear buffers