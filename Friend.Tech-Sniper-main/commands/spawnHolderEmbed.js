const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { replyAdminOnlyEmbed, sendHolderEmbed } = require(`../embedCreator.js`); // Importing the sniper menu embed.

module.exports = {
    data: new SlashCommandBuilder()
        .setName('spawnholderembed')
        .setDescription('Spawn the holder embed in the current channel.'),
    async execute(discordClient, interaction) {
        await interaction.deferReply({ ephemeral: true }); // Sends a deferred reply that is ephemeral.
        if (interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) { // Makes sure the user calling the command is an admin.
            await sendHolderEmbed(interaction);
        } else {
            await replyAdminOnlyEmbed(interaction);
        }
        return;
    },
};