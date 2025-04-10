const { SlashCommandBuilder } = require('discord.js');
const { PermissionsBitField } = require(`discord.js`);
const { sendWelcomeEmbed, replyAdminOnlyEmbed } = require(`../embedCreator.js`); // Importing the sniper menu embed.

module.exports = {
    data: new SlashCommandBuilder()
        .setName('spawnwelcomeembed')
        .setDescription('Spawn the welcome embed in the current channel.'),
    async execute(discordClient, interaction) {
        await interaction.deferReply({ ephemeral: true }); // Sends a deferred reply that is ephemeral.
        if (interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) { // Makes sure the user calling the command is an admin.
            await sendWelcomeEmbed(discordClient);
        } else {
            await replyAdminOnlyEmbed(interaction);
        }
        return;
    },
};