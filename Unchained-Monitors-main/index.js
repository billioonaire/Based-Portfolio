require('dotenv').config();
const verifiedContractsMonitor = require('./monitors/etherscanVerifiedContracts');
const baseVerifiedContractsMonitor = require('./monitors/basescanVerifiedContracts')
const ethereumContractDeployMonitor = require('./monitors/ethereumContractDeploy');
const baseContractDeployMonitor = require('./monitors/baseContractDeploy');

const metadropDeployMonitor = require('./monitors/metadropDeploy');
const pinksaleContractsMonitor = require('./monitors/pinksaleContracts');
const eventsMonitor = require('./monitors/eventsMonitor');
const etherscanAPIKey = require('./monitors/etherscanAPIKey');
//const liqLockMonitor = require('./monitors/liqLockMonitor');
const fs = require('node:fs');
const path = require('node:path');
const { getUserSettings, updateUserSetting } = require(`./settingsFunctions.js`);
const { showChangeSettingModal } = require(`./modalCreator.js`);
const { editSettingsEmbed, updateIntegerRequiredInputEmbed, updateSettingChangedEmbed } = require(`./embedCreator.js`);
const { getSettingsSelectMenu } = require(`./buttonCreator.js`);

const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds], partials: [Partials.Channel] }); // Create a new client instance

// Essential for the command handler:
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
}

// Runs only once when the bot starts
client.once('ready', () => {

    console.log('Connected to Discord!');

    verifiedContractsMonitor.startVerifiedContractMonitor(client);
    baseVerifiedContractsMonitor.startVerifiedContractMonitor(client)
    ethereumContractDeployMonitor.startContractDeployMonitor(client);
    metadropDeployMonitor.startMetadropMonitor(client);
    //pinksaleContractsMonitor.pinksaleMonitorStart(client);
    //eventsMonitor.startEventsMonitor(client);
    baseContractDeployMonitor.startBaseContractDeployMonitor(client)
    //etherscanAPIKey.startEtherscanKeyCheck();
    //liqLockMonitor.start(client);
    
    //bakeryDeployMonitor.startBakeryMonitor();
});

client.on('interactionCreate', async interaction => { // Discord interaction listener.
    if (interaction.isCommand()) { // True if the interaction was a slash command.
        const command = client.commands.get(interaction.commandName);
        await interaction.deferReply({ ephemeral: true }); // Sends a deferred reply that is ephemeral.
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    } else {
        console.log(interaction.customId + " was clicked by user " + interaction.user.id);
        switch (interaction.customId) { // Detecting for the customIds of buttons or modals and executing their code.
            case `homeButton`:

                break;
            case `settingsSelectMenu`:
                console.log(`${interaction.user.globalName} clicked the button to edit their ${interaction.values[0]}`);
                if (interaction.values[0] === 'antiRug' ||
                    interaction.values[0] === 'autoApprove' ||
                    interaction.values[0] === 'buyConfirmation' ||
                    interaction.values[0] === 'sellConfirmation') { // If the selected option is one of the boolean options.
                    let userSettings = getUserSettings(interaction.user.id);
                    let oldSetting = updateUserSetting(interaction.user.id, interaction.values[0], !userSettings[interaction.values[0]]);
                    await updateSettingChangedEmbed(interaction, interaction.values[0], oldSetting, !userSettings[interaction.values[0]]); // Sending an embed to say that the user has updated their settings.
                    await new Promise(resolve => setTimeout(resolve, 4000)); // Wait for 4 seconds
                    userSettings = getUserSettings(interaction.user.id); // Getting the user's settings.
                    await editSettingsEmbed(interaction, userSettings);
                } else {
                    await showChangeSettingModal(interaction);
                }
                break;
            case `changeSettingModal`:
                let settingName = interaction.fields.components[0].components[0].customId;
                let settingValue = interaction.fields.components[0].components[0].value;
                console.log(`${interaction.user.globalName} inputted ${settingValue} as their ${settingName}`);
                if (isNaN(parseInt(settingValue))) {
                    await updateIntegerRequiredInputEmbed(interaction); // Show the user an embed that says they must input an integer.
                } else {
                    let oldSetting = updateUserSetting(interaction.user.id, settingName, settingValue);
                    await updateSettingChangedEmbed(interaction, settingName, oldSetting, settingValue); // Sending an embed to say that the user has updated their settings.
                }
                await new Promise(resolve => setTimeout(resolve, 4000)); // Wait for 4 seconds
                let userSettings = getUserSettings(interaction.user.id); // Getting the user's settings.
                await editSettingsEmbed(interaction, userSettings);
                break;
        }
    }
});

client.login(process.env.DISCORD_TOKEN); // Logging into the discord bot.