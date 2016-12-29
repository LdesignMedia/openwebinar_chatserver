/**
 * This a sample file you will need to rename this file to config.js also update it with your environment details
 */
var config = {};
config.ssl_key = '/home/example.com/homedir/ssl/domain.key'; // Replace by real path
config.ssl_cert = '/home/example.com/homedir/ssl/domain.crt'; // Replace by real path
config.servers = {

    /**
     * Shared secret
     *
     * A possible way to generate a random secret is by running the following command from a unix shell:
     * tr -c -d '0123456789abcdefghijklmnopqrstuvwxyz' </dev/urandom | dd bs=32 count=1 2>/dev/null;echo
     *
     * also added to MoodleFreak Webcast settings
     * /admin/settings.php?section=modsettingopenwebinar
     */
    'abcd123456789': {

        /**
         * Hostname used for namespace and validation of the io request
         * The domain where moodle is hosted on
         */
        hostname : 'example.com',

        /**
         * namespace
         * please keep it short and alpha_numeric
         */
        namespace : 'example_live',

        /**
         * Callback url for saving the message buffer to moodle1
         * Should always end with this /mod/openwebinar/api.php?action=chatlog
         */
        callback : 'http://example.com/mod/openwebinar/api.php?action=chatlog'
    },

    /**
     *  Note: you could add more servers on a single node chat server
     *
     * 'dcba987654321': {
        hostname : 'example2.com',
        namespace : 'example2_live',
        callback : 'http://example2.com/mod/openwebinar/api.php?action=chatlog'
        },
     */
};

/**
 * Port number we want to run on
 * @type number
 */
config.port = process.env.PORT || 3001;
module.exports = config;