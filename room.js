function Room(name, id, owner , serverkey) {
    this.name = name;
    this.id = id;
    this.owner = owner;
    this.serverkey = serverkey;
    this.people = [];
    this.messageBuffer = [];
};

Room.prototype.addPerson = function (personID) {
    this.people.push(personID);
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
Room.prototype.addMessage = function (messageObject) {
    this.messageBuffer.push(messageObject);
};

Room.prototype.forwardMessagesToDBServer = function () {

    //The url we want is `www.nodejitsu.com:1337/`
    var options = {
        host: 'www.nodejitsu.com',
        path: '/',
        //since we are listening on a custom port, we need to specify it by hand
        port: '1337',
        //This is what changes the request to a POST request
        method: 'POST'
    };

    var callback = function(response) {

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
