/**
 * Helper functions
 * @constructor
 */
module.exports = function Util() {
    return {
        currentTime : function (){

            // Unix timestamp
            return Math.round(new Date().getTime() / 1000);

        },
        validClientCode: function (hash, hostname) {

            if (typeof Const.clients[hash] !== 'undefined') {
                var token = Const.clients[hash];
                var currentTime = Math.round(new Date().getTime() / 1000);
                //check if the license of server still valid
                if (currentTime < Const.servers[token].licenseTo && Const.servers[token].hostname == hostname) {
                    console.log('Valid license');
                    return true;
                }
                else {
                    console.log('ERROR: Timeup? ' + Const.servers[token].hostname + '|' + hostname + '|' + currentTime + '<' + Const.servers[token].licenseTo);
                }
            }
            else {
                console.log('Unknown hash');
            }

            return false;
        },
        validToken     : function (token, hostname) {
            if (typeof Const.servers[token] !== 'undefined') {
                var currentTime = Math.round(new Date().getTime() / 1000);
                //check if the license of server still valid
                if (currentTime < Const.servers[token].licenseTo) {
                    if (Const.servers[token].hostname !== hostname) {
                        return {
                            error : 'Hostname wrong',
                            status: false
                        };
                    }
                    console.log('Valid Token');
                    return {
                        data  : Const.servers[token],
                        status: true
                    };
                }
                else {
                    return {
                        error : 'License expired',
                        status: false
                    };
                }
            }
            return {
                error : 'Wrong token',
                status: false
            };
        }
    };
}