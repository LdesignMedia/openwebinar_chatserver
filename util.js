/**
 * Helper functions
 * @constructor
 */
var config = require('./config');

module.exports = function Util() {
    return {
        currentTime              : function () {

            // Unix timestamp
            return Math.round(new Date().getTime() / 1000);

        },
        getRoomNameFromChatobject: function (chatobject) {
            return chatobject.broadcastkey + chatobject.room;
        },
        validToken: function (token, hostname) {

            if (typeof config.servers[token] !== 'undefined') {

                if (config.servers[token].hostname !== hostname) {
                    return {
                        error : 'hostname_incorrect',
                        status: false
                    };
                }
                return {
                    status   : true,
                    namespace: config.servers[token].namespace,
                    callback: config.servers[token].callback
                };
            }
            return {
                error : 'wrong_token',
                status: false
            };
        }
    };
}