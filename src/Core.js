/*

  Botkit Core 1.0

  A toolkit for building conversational software of all types.
  This library contains the core functionality for receiving messages,
  sending replies, matching triggers of different types, and handling
  multi-message sessions through a system we call Conversations.

*/


var debug = require('debug')('botkit:core');

module.exports = function(config) {

    var botkit = {
        config: config,
        boot: function() {
            debug('Booting bot...');
            var that = this;
            var has_db = false;
            var has_ws = false;

            that.on('boot:database_connected', function() {
              has_db = true;
              if (has_ws) {
                that.trigger('booted',[that]);
              }
            });
            that.on('boot:webserver_up', function() {
              has_ws = true;
              if (has_db) {
                that.trigger('booted',[that]);
              }
            });

            that.on('booted',function(controller) {
              debug('Boot complete!');
            });
        },
        receive: function(bot, message) {
            debug('Received: ', message);
            botkit.ingest(bot, message).then(function(message, response) {
                debug('Response: ', response);
                var convo = botkit.createConversation(message, bot, response.state, response.script);
                convo.fulfill();
            });
        },
        loadSkills: function(path) {
            var normalizedPath = require("path").join(path);
            require("fs").readdirSync(normalizedPath).forEach(function(file) {
              require(normalizedPath + "/" + file)(botkit);
            });
        },
        spawn: function(type,options) {
          var bot = {
            config: options,
            type: type,
            say: function(message) {
              var that = this;
              return new Promise(function(resolve, reject) {
                botkit.middleware.send.run(that, message, function(err, bot, message) {
                  bot.send(message).then(resolve).catch(reject);
                });
              });
            },
          }
          return new Promise(function(resolve, reject) {
            botkit.middleware.spawn.run(bot, function(err, bot) {
              if (err) {
                reject(err);
              } else {
                resolve(bot);
              }
            });
          });
        }
    }


    // basic emitting and handling of events
    require(__dirname + '/features/events.js')(botkit);

    // Add pre-configured Express webserver
    require(__dirname + '/features/webserver.js')(botkit);

    // Add pre-configured Express webserver
    require(__dirname + '/features/plugin_loader.js')(botkit);

    // database models and access routines
    require(__dirname + '/features/database.js')(botkit);

    // expose middleware endpoints and processes for processing messages
    require(__dirname + '/features/middleware.js')(botkit);


    // set up the ability to walk through a semi-scripted conversation
    require(__dirname + '/features/conversation.js')(botkit);

    // API calls to botkit studio
    require(__dirname + '/features/API.js')(botkit);

    // methods for understanding the intent or purpose of the message
    // including connecting it to an already existing conversation
    require(__dirname + '/features/understand_sessions.js')(botkit);

    // add ability to "hear" simple triggers in message events
    require(__dirname + '/features/understand_hearing.js')(botkit);

    // add ability to "hear" simple triggers in message events
    require(__dirname + '/features/understand_remote_triggers.js')(botkit);


    return botkit;

}
