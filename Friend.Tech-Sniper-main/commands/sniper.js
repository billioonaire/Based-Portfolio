const { SlashCommandBuilder } = require('discord.js');
const { replySniperMenuEmbed } = require(`../embedCreator.js`); // Importing the sniper menu embed.

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sniper')
        .setDescription('Display the menu for the Friend.Tech sniper.'),
    async execute(discordClient, interaction) {
        await replySniperMenuEmbed(interaction);
        return;
    },
};