const respondOnError = require('./src/respond-on-error');
const routeMessage = require('./src/route-message');
const sendToSlack = require('./src/slack-send-message');

// const validateTeam = require('./src/validate-team');
var Sequelize = require('sequelize');
var db        = require('./lib/models/db')(Sequelize);


exports.handler =  function (event, context, callback) {
    db.Team.findOne({ where: { slack_id: event.team_id } })
    .then( (team) => {
        if (team === null) {
            // bail.  We somehow got a message from a team
            // that didn't install the bot.
            console.log("We somehow got a message from a team that didn't install Quackbot.");
            return null;
        } else {
            team.latestAuthorization().then(
                (authorization) => {
                    
                    // Tell the team they're not cool enough.
                    if (!team.verified) {
                        console.log('Team not yet validated by DocumentCloud. Informing user ...');
                        var message = "Hi! I'm still waiting for the folks at DocumentCloud to say you can use my services. I'll let you know when we're ready to go.";
                        return sendToSlack(event, message);
                    } else {
                        // add the authorization info to the event
                        console.log('Team Verified, handling message');
                        event.authorization = authorization.details.bot;

                        // Extract command words.
                        const commandWords = event.text.trim().split(/\s+/);
                        
                        // To reach the bot, it must be a DM (in a "D" channel)
                        // or an @-mention at the start of a line.
                        
                        var is_direct_message_to_me = event.channel.match(/^D*/)[0] == "D";
                        var command_starts_with_me = (commandWords[0] == `<@${event.authorization.bot_user_id}>`);
                        
                        if (!is_direct_message_to_me && !command_starts_with_me) {
                            return 'Ignoring message that is none of my beeswax, bye!';
                        }

                        if (command_starts_with_me) {
                            event.command = {
                                verb: commandWords[1].toLowerCase(),
                                predicate: commandWords.splice(2).join(' '),
                            };
                        } else {
                            event.command = {
                                verb: commandWords[0].toLowerCase(),
                                predicate: commandWords.splice(1).join(' '),
                            };
                        }

                        console.log(`Event posted to ${event.stage} stage with verb '${event.command.verb}' and predicate '${event.command.predicate}'.`);

                        return routeMessage(event).catch((message) => respondOnError(event, message) );
                    }
                }
            );
        }
    })
    .then(message => {
        console.log(message);
        callback(null);
    })
    .catch(error => {
        console.error(error.message);
        callback(null);
    });
};

