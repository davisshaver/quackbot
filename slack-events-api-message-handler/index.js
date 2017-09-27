const respondOnError = require('./src/respond-on-error');
const routeMessage = require('./src/route-message');
const sendToSlack = require('./src/slack-send-message');
const validateTeam = require('./src/validate-team');



exports.handler =  function (event, context, callback) {
    validateTeam(event).then(validation => {
        
        // bail if not validated
        if (!validation.cleared) {
            console.log('Team not yet validated by DocumentCloud. Informing user ...');
            var message = "I'm still waiting for the folks at DocumentCloud to say you can use my services!";
            return sendToSlack(event, message);
        } 
        
        // add the authrization info to the event
        event.authorization = validation;
        
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
                predicate: commandWords.splice(2).join(' '),
                verb: commandWords[1],
            };
        } else {
            event.command = {
                predicate: commandWords.splice(1).join(' '),
                verb: commandWords[0],
            };
        }

        console.log(`Event posted to ${event.stage} stage with verb '${event.command.verb}' and predicate '${event.command.predicate}'.`);

        return routeMessage(event).catch((message) => respondOnError(event, message) );

    })
    .then(message => {
        console.log(message);
        callback(null);
    })
    .catch(error => {
        console.error(error.message);
        callback(error);
    });
};

