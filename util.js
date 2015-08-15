/**
 * Helper functions
 * @constructor
 */
var config = require('./config');
module.exports = function Util() {
    return {

        /**
         * Concat some chatobject params to get a roomname
         * @param chatobject
         * @returns {*}
         */
        getRoomNameFromChatobject: function (chatobject) {
            return chatobject.broadcastkey + chatobject.room;
        },

        /**
         * Check if the client has a valid token / shared secret
         * Also we checking if the hostname are matching
         *
         * @param token
         * @param hostname
         * @returns {*}
         */
        validToken: function (token, hostname) {

            if (config.servers[token] !== undefined) {

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