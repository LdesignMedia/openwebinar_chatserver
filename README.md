Moodlefreak webinar chat engine
====================
This is chat/communication engine special developed for [moodle activity openwebinar](https://github.com/MoodleFreak/moodle_mod_openwebinar) 

Author
====================
![MoodleFreak.com](http://moodlefreak.com/logo_small.png)

Author: Luuk Verhoeven, [MoodleFreak.com](http://www.moodlefreak.com/)

Requires: [NODE.js](https://nodejs.org/) rest of dependence are included to node_modules are include. **No bower or composer needed** 

Description
====================

This service needed to be running in the background. Provide realtime communication between clients in `mod_openwebinar`.  


Only needed when you host the chat service your self.
 

List of features
====================

#### Server
  - On termination or exception it will try to send chat logs to moodle
  - Message buffer will be send to moodle every 60 seconds
  - Send chat logs to moodle environment
  - Allow more moodle environments with `mod_openwebinar` installed to use this services
  - Multiple room support
  - Auto closing rooms when all clients are disconnected
  - Include a config-sample
  - Can start with user specified PORT
  - Room userlist
  - Room message buffer
  
#### Chat
  - Live socket chat
  - Room status / muting flags
  - Parse useragent from clients
  - Callback to moodle to check who is the broadcaster
  - Check for different user roles
  
Installation
====================
1. Install project to /opt/moodle-chatserver/

### Socket file / embed to the chat server.
https://#DOMAIN#:3001//socket.io/socket.io.js

FAQ
====================
- If your clients have problems with connecting try to run on port that firewalls won't block 80 or 443
- Make sure the correct chat path is entered in moodle `mod_openwebinar` settings
- You need to add own `config.js` file to root of this project with your settings see `config-sample.js` for more details
- This isn't a plugin for `moodle` but a services that will be needed when you want to run `mod_openwebinar` with own chat service.

Changelog
====================

See version control for the complete history, major changes in this versions will be list below.