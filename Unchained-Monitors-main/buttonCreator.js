const { StringSelectMenuBuilder, ActionRowBuilder } = require(`discord.js`);

function getSettingsSelectMenu(userSettings) {
    let settingsSelectMenu = new StringSelectMenuBuilder()
        .setCustomId(`settingsSelectMenu`)
        .setPlaceholder(`Which setting would you like to edit?`)
        .addOptions([
            {
                label: `Anti Rug (${userSettings.antiRug})`,
                value: `antiRug`
            },
            {
                label: `Slippage (${userSettings.slippage}%)`,
                value: `slippage`
            },
            {
                label: `Max Gas Price (${userSettings.maxGasPrice})`,
                value: `maxGasPrice`
            },
            {
                label: `Max Gas Limit (${userSettings.maxGasLimit})`,
                value: `maxGasLimit`
            },
            {
                label: `Auto Approve (${userSettings.autoApprove})`,
                value: `autoApprove`
            },
            {
                label: `Buy Confirmation (${userSettings.buyConfirmation})`,
                value: `buyConfirmation`
            },
            {
                label: `Buy Gas Price (${userSettings.buyGasPrice})`,
                value: `buyGasPrice`
            },
            {
                label: `Max Buy Tax (${userSettings.maxBuyTax})`,
                value: `maxBuyTax`
            },
            {
                label: `Sell Confirmation (${userSettings.sellConfirmation})`,
                value: `sellConfirmation`
            },
            {
                label: `Sell Gas Price (${userSettings.sellGasPrice})`,
                value: `sellGasPrice`
            },
            {
                label: `Max Sell Tax (${userSettings.maxSellTax})`,
                value: `maxSellTax`
            }
        ]);
        let firstActionRow = new ActionRowBuilder().addComponents(settingsSelectMenu); // Creating the action row for the options dropdown.
        return firstActionRow;
}

module.exports = { getSettingsSelectMenu };