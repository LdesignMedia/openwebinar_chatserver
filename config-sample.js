/**
 * This a sample file you will need to rename this file to config.js also update it with your credentials
 */
var config = {};

config.servers = {

    /**
     * Shared secret
     *
     * also added to MoodleFreak Webcast settings
     * /admin/settings.php?section=modsettingwebcast
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
         * Should always end with this /mod/webcast/api.php?action=chatlog
         */
        callback : 'http://example.com/mod/webcast/api.php?action=chatlog'
    },

    /**
     *  Note: you could add more servers on a single node chat server
     *
     * 'dcba987654321': {
        hostname : 'example2.com',
        namespace : 'example2_live',
        callback : 'http://example2.com/mod/webcast/api.php?action=chatlog'
        },
     */
};

/**
 * Port number we want to run on
 * @type number
 */
config.port = process.env.PORT || 3001;
module.exports = config;