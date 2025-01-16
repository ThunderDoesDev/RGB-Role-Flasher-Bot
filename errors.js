const chalk = require("chalk");
const {
    EmbedBuilder,
    MessageFlags
} = require("discord.js");
const fs = require("fs");

const time = () => (`${chalk.grey(new Date().toLocaleString('en-AU', {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    timeZone: "Australia/Brisbane",
    hour12: true
}))}`);

module.exports = async (error, sendable, interaction) => {
    let incidentID = Math.random().toString(36).substr(2);
    if (error !== null && sendable === true && interaction !== null) {
        const str = `An error has occurred!\nDate: ${new Date().toLocaleDateString()}\nTime: ${time()} (Australia/Brisbane Timezone)\nIncident: ${incidentID}`;
        const test = new EmbedBuilder()
            .setDescription(`${str}`)
            .setColor(`#FF0000`)
        fs.appendFileSync(`./errors.log`, `Date: ${new Date().toLocaleDateString()}\nTime: ${time()} (Australia/Brisbane Timezone)\nIncident: ${incidentID}\n${error}\n`);
        await interaction.reply({
            embeds: [test],
            flags: MessageFlags.Ephemeral
        });
        incidentID++;
    }
}