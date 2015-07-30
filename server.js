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
var sanitizer = require('caja-sanitizer');

var Room = require('./room.js');
var Util = require('./util.js')();

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

function purge(s, action) {

    console.log('purge(' + action + ')');

    /*
     The action will determine how we deal with the room/user removal.
     These are the following scenarios:
     if the user is the owner and (s)he:
     1) disconnects (i.e. leaves the whole server)
     - advise users
     - delete user from users object
     - delete room from rooms object
     - delete chat history
     - remove all users from room that is owned by disconnecting user
     2) removes the room
     - same as above except except not removing user from the users object
     3) leaves the room
     - same as above
     if the user is not an owner and (s)he's in a room:
     1) disconnects
     - delete user from users object
     - remove user from room.users object
     2) removes the room
     - produce error message (only owners can remove rooms)
     3) leaves the room
     - same as point 1 except not removing user from the users object
     if the user is not an owner and not in a room:
     1) disconnects
     - same as above except not removing user from room.users object
     2) removes the room
     - produce error message (only owners can remove rooms)
     3) leaves the room
     - n/a
     */

    if (people[s.id].inroom) {

        //user is in a room
        var room = rooms[people[s.id].inroom];

        // check which room user is in.
        // user in room and owns room
        if (s.id === room.owner) {

            if (action === "disconnect") {
                io.sockets.in(s.room).emit("update", "The owner (" + people[s.id].name + ") has left the server. The room is removed and you have been disconnected from it as well.");

                var socketids = [];
                for (var i = 0; i < sockets.length; i++) {
                    socketids.push(sockets[i].id);
                    if (_.contains((socketids)), room.users) {
                        sockets[i].leave(room.name);
                    }
                }

                if (_.contains((room.users)), s.id) {
                    for (var i = 0; i < room.users.length; i++) {
                        people[room.users[i]].inroom = null;
                    }
                }

                //remove users from the room:users{}collection
                room.users = _.without(room.users, s.id);

                //delete the room
                delete rooms[people[s.id].owns];

                //delete user from users collection
                delete people[s.id];

                //delete the chat history
                delete chatHistory[room.name];

                var sizePeople = _.size(people);
                var sizeRooms = _.size(rooms);

                io.emit("update-users", {
                    users: people,
                    count : sizePeople
                });
                io.emit("roomList", {
                    rooms: rooms,
                    count: sizeRooms
                });

                var o = _.findWhere(sockets, {'id': s.id});
                sockets = _.without(sockets, o);

            } else if (action === "removeRoom") { //room owner removes room

                io.sockets.in(s.room).emit("update", "The owner (" + people[s.id].name + ") has removed the room. The room is removed and you have been disconnected from it as well.");
                var socketids = [];

                for (var i = 0; i < sockets.length; i++) {
                    socketids.push(sockets[i].id);
                    if (_.contains((socketids)), room.users) {
                        sockets[i].leave(room.name);
                    }
                }

                if (_.contains((room.users)), s.id) {
                    for (var i = 0; i < room.users.length; i++) {
                        people[room.users[i]].inroom = null;
                    }
                }

                delete rooms[people[s.id].owns];
                people[s.id].owns = null;
                room.users = _.without(room.users, s.id); //remove users from the room:users{}collection
                delete chatHistory[room.name]; //delete the chat history

                var sizeRooms = _.size(rooms);
                io.emit("roomList", {
                    rooms: rooms,
                    count: sizeRooms
                });

            } else if (action === "leaveRoom") { //room owner leaves room

                io.sockets.in(s.room).emit("update", "The owner (" + people[s.id].name + ") has left the room. The room is removed and you have been disconnected from it as well.");

                var socketids = [];

                for (var i = 0; i < sockets.length; i++) {
                    socketids.push(sockets[i].id);
                    if (_.contains((socketids)), room.users) {
                        sockets[i].leave(room.name);
                    }
                }

                if (_.contains((room.users)), s.id) {
                    for (var i = 0; i < room.users.length; i++) {
                        people[room.users[i]].inroom = null;
                    }
                }

                delete rooms[people[s.id].owns];
                people[s.id].owns = null;
                room.users = _.without(room.users, s.id); //remove users from the room:users{}collection
                delete chatHistory[room.name]; //delete the chat history
                sizeRooms = _.size(rooms);
                io.emit("roomList", {
                    rooms: rooms,
                    count: sizeRooms
                });
            }
        } else {

            //user in room but does not own room
            if (action === "disconnect") {

                io.emit("update", people[s.id].name + " has disconnected from the server.");
                if (_.contains((room.users), s.id)) {
                    var personIndex = room.users.indexOf(s.id);
                    room.users.splice(personIndex, 1);
                    s.leave(room.name);
                }

                delete people[s.id];
                sizePeople = _.size(people);
                io.emit("update-users", {
                    users: people,
                    count : sizePeople
                });

                var o = _.findWhere(sockets, {'id': s.id});
                sockets = _.without(sockets, o);

            } else if (action === "removeRoom") {

                s.emit("update", "Only the owner can remove a room.");

            } else if (action === "leaveRoom") {

                if (_.contains((room.users), s.id)) {
                    var personIndex = room.users.indexOf(s.id);
                    room.users.splice(personIndex, 1);
                    people[s.id].inroom = null;
                    io.emit("update", people[s.id].name + " has left the room.");
                    s.leave(room.name);
                }

            }
        }
    }
    else {

        //The user isn't in a room, but maybe he just disconnected, handle the scenario:
        if (action === "disconnect") {

            io.emit("update", people[s.id].name + " has disconnected from the server.");
            delete people[s.id];

            var sizePeople = _.size(people);
            io.emit("update-users", {
                users: people,
                count : sizePeople
            });

            var o = _.findWhere(sockets, {'id': s.id});
            sockets = _.without(sockets, o);
        }
    }
}

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
        if (io.nsps[socket.namespace].adapter.rooms[roomname] !== undefined) {

            io.sockets.in(roomname).emit("update-user-list", {

            });

            fn({'status' : true});

        }else{
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