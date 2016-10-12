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
            var append = '';
            // Private messages rooms.
            if (chatobject.pm_userid !== undefined) {
                // Ending up with same room naming.
                append += '_pm_';
                if(chatobject.pm_userid > chatobject.userid){
                    append += chatobject.pm_userid + '_' + chatobject.userid;
                }else{
                    append += chatobject.userid + '_' + chatobject.pm_userid;
                }
            }

            return chatobject.broadcastkey + chatobject.room + append;
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