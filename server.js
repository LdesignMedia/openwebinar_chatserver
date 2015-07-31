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

function join(socket , chatobject , fn){

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
    if (typeof rooms[socket.namespace] === 'undefined') {
        rooms[socket.namespace] = [];
    }

    // Use namespace to allow more environment to connect
    var roomname = Util.getRoomNameFromChatobject(chatobject);
    if(typeof rooms[socket.namespace][roomname] ===  'undefined'){
        rooms[socket.namespace][roomname]  = new Room(roomname, socket.namespace);
    }

    // Reference
    var room = rooms[socket.namespace][roomname];
    room.addUser(chatobject);

    // Join the room
    socket.join(roomname).in(socket.namespace);

    // Only send userlist update to correct room
    io.sockets.in(roomname).emit("update-user-list", {
        users: room.getAllUsers(),
        count : room.getUserCount()
    });

    // Add the socket to a container
    sockets.push(socket);

    fn({'status': true});
}

io.sockets.on("connection", function (socket) {

    // Set some defaults
    socket.has_access = false;
    socket.namespace = "";

    socket.on("join", function (chatobject, fn) {
        join(socket , chatobject , fn);
    });

    socket.on("send", function (chatobject , fn) {

        if(!socket.has_access || socket.namespace == ""){

            // Maybe got disconnected???
            join(socket , chatobject , fn);

            // Stop invalid calls
            if(!socket.has_access){
                return;
            }
        }

        var roomname = Util.getRoomNameFromChatobject(chatobject);
        var roomobj = io.sockets.adapter.rooms[roomname];

        if (typeof roomobj !== 'undefined' ) {

            var room = rooms[socket.namespace][roomname];

            // Set the message to the room
            var message = room.addMessage(chatobject);

            // Send to clients
            io.sockets.in(roomname).emit("update-chat", message);

            fn({'status' : true});

        }else{
            console.log( 'unknown_room');
            fn({'status' : false, 'error' : 'unknown_room'});
        }
    });

    socket.on("disconnect", function () {
        console.log("disconnect");

        // Remove this user from all possible rooms
        for(var roomname in rooms[socket.namespace]){
            var room = rooms[socket.namespace][roomname];
            if(room.removeUser(socket.id)){

                if(room.getUserCount() == 0){
                    console.log('Nobody in the room anymore.. we should cleanup');
                    room.cleanup();
                }

                console.log('update-user-list');
                io.sockets.in(roomname).emit("update-user-list", {
                    users: room.getAllUsers(),
                    count : room.getUserCount()
                });

            }else{
                console.log('You are not in this room!');
            }
        }

        // Remove from the sockets
        // @todo check if we can do without it
        var o = _.findWhere(sockets, {'id': socket.id});
        sockets = _.without(sockets, o);
    });
});