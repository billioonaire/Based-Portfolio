const { SlashCommandBuilder } = require('@discordjs/builders');
const { editSettingsEmbed } = require(`../embedCreator.js`);
const { getUserSettings } = require(`../settingsFunctions.js`);
const { getSettingsSelectMenu } = require(`../buttonCreator.js`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('View the settings menu.'),
    async execute(interaction) {
        console.log(interaction)
        let userSettings = getUserSettings(interaction.user.id); // Getting the user's settings.
        await editSettingsEmbed(interaction, userSettings);
        return;
    },
};