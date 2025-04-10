const { TextInputBuilder, TextInputStyle, ModalBuilder, ActionRowBuilder } = require(`discord.js`);

async function showChangeSettingModal(interaction) { // Shows the modal for changing a setting.
    let setting = interaction.values[0];
    let settingString = setting.replace(/([A-Z])/g, ' $1').charAt(0).toUpperCase() + setting.replace(/([A-Z])/g, ' $1').slice(1).trim();
    let settingInputField = new TextInputBuilder()
        .setCustomId(setting)
        .setLabel(settingString)
        .setStyle(TextInputStyle.Short);
    let changeSettingModal = new ModalBuilder()
        .setCustomId(`changeSettingModal`)
        .setTitle(`Input new ${settingString}`)
        .addComponents(new ActionRowBuilder().addComponents(settingInputField));
    await interaction.showModal(changeSettingModal);
}

module.exports = { showChangeSettingModal };