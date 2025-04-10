// Importing Required Libraries
require("dotenv").config();
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const ethers = require(`ethers`); // Importing the ethers library.

// Importing dependencies from other files.
const { replySniperMenuEmbed, replyTaskTypeEmbed, updateInvalidHandleInputEmbed, updateInvalidSweepPriceInputEmbed, updateInvalidPrioInputEmbed, updateSnipeTaskAddedEmbed,
    updateInvalidWalletAddressInputEmbed, updateSpamTaskAddedEmbed, updateManageWhichTasksEmbed, updateNoSnipeTasksEmbed, updateNoSpamTasksEmbed, updateManageSpamTasksEmbed,
    updateEditSpamTaskEmbed, updateSpamTaskWalletChangedEmbed, updateErrorEmbed, updateSpamTaskRemovedEmbed, updateNoSpamSettingsEmbed, updateInvalidTxPerSecondInputEmbed,
    updateInvalidStartDelayInputEmbed, updateInvalidDurationInputEmbed, updateSpamSettingsSavedEmbed, updateNoSpamTaskFoundEmbed, updateManageSnipeTasksEmbed,
    updateEditSnipeTaskEmbed, updateNoSnipeTaskFoundEmbed, updateSnipeTaskSweepPriceChangedEmbed, updateSnipeTaskPrioChangedEmbed, updateSnipeTaskRemovedEmbed,
    updateContractSellingEmbed, updateNoKeysHeldContractEmbed, updateContractSellKeyEmbed, updateSellTxSentEmbed, updateNoWalletFoundEmbed, updateSpamTaskSweepPriceChangedEmbed,
    updateSettingsEmbed, updateConfirmPrivateKeyEmbed, updateWalletStoredEmbed, updateInvalidPKEmbed, updateDataDeletedEmbed, updateDeployProxyContractEmbed, updateProxyNotFoundEmbed,
    updateSellFromSelectionEmbed, updateWalletSellingEmbed, updateWalletSellKeyEmbed, updateInvalidDepositAmountEmbed, updateNotEnoughEthEmbed, updateNoKeysHeldWalletEmbed,
    replyNotReadyEmbed, dmCrashPreventedEmbed
} = require(`./embedCreator.js`);
const { showCreateSnipeTaskModal, showCreateSpamTaskModal, showChangeSpamTaskWalletModal, showSpamSettingsModal, showSearchSpamTasksModal, showChangeSnipeTaskSweepPriceModal,
    showSearchSnipeTaskModal, showChangeSnipeTaskPrioModal, showSearchContractSellModal, showInputSpamWalletModal, showChangeSpamTaskSweepPriceModal, showInputPrivateKeyModal,
    showDepositModal
} = require(`./modalCreator.js`);
const { startMonitors } = require(`./friendtechMonitors.js`);
const { kosettoHoldingsCall } = require(`./apiCalls.js`);
const { startNewUserMonitor } = require('./newUserSignups.js')
const {
    addSnipeTask, addSpamTask, getSnipeTasks, getSpamTasks, changeSpamTaskWalletAddress, removeSpamTask, getSpamSettings, setSpamSettings, getSpamTask, getSnipeTask,
    changeSnipeTaskSweepPrice, changeSnipeTaskPrio, removeSnipeTask, changeSpamTaskSweepPrice, removeUser, getProxyContract, getWalletAddress, setProxyContract
} = require(`./dataHandler.js`);
const { storeIdentifier } = require(`./identifiers.js`);
const { deployWithPrivateKey, sendWalletBuyTransaction, sendWalletSellTransaction, withdrawFromBot, sendDepositTransaction, sendContractSellTransaction } = require(`./transactionManager.js`);
const { replyConfirmWalletBuyEmbed, replyRoleRequiredEmbed, updatePendingBuyTransactionEmbed, updateBuyTransactionConfirmedEmbed, updateBuyTransactionFailedEmbed,
    updateDeployPendingTransaction, updateDeployConfirmedEmbed, updateDeployFailedEmbed, updatePendingSellTransactionEmbed, updateSellTransactionConfirmedEmbed,
    updateSellTransactionFailedEmbed, updatePendingWithdrawTransactionEmbed, updateWithdrawTransactionConfirmedEmbed, updatePendingDepositTransactionEmbed,
    updateDepositTransactionConfirmedEmbed, sendContractSellPendingEmbed, sendContractSellConfirmedEmbed
} = require(`./transactionEmbeds.js`);

const baseProvider = new ethers.providers.JsonRpcProvider("https://base-mainnet.g.alchemy.com/v2/3jvxo1TC_IJ28e-SmuOULOlJJtzF6hCL");
const FRIEND_TECH_ROUTER_CONTRACT = "0xF832D2d6b1bBc27381cE77166F4Ee9cF6cAA3819"
const friendTechRouterABI = require("./abi/friendTechRouter.json");
const friendTechRouterContract = new ethers.Contract(FRIEND_TECH_ROUTER_CONTRACT, friendTechRouterABI, baseProvider);

const friendTechContractABI = require(`./abi/friendTechABI.json`);

const taskHandler = require('./taskHandler.js');
const { getBalance } = require("./ethersInteractions.js");
taskHandler.start();
setInterval(taskHandler.start, 2000);

const HOLDER_ROLE = `1153052684081963038`;
const ADMIN_ROLE = `1143708902274371614`;

const discordClient = new Client({
    intents:
        [
            GatewayIntentBits.Guilds, // Required to see servers
            GatewayIntentBits.GuildMessages // Required to send and receive messages in servers
        ],
    partials: [
        Partials.Channel
    ]
}); // Create a new discordClient instance for the discord bot.

//Essential for the command handler:
discordClient.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    discordClient.commands.set(command.data.name, command);
}

discordClient.once('ready', () => { // Runs only once when the bot starts

    console.log('Ready!');
    startMonitors(discordClient, taskHandler);
    startNewUserMonitor(discordClient, taskHandler);
    taskHandler.balanceCheckLoop(discordClient);
});

discordClient.on('interactionCreate', async interaction => { // Handles interactions for the command handler
    if (interaction.isCommand()) { // If the interaction is a command.
        const command = discordClient.commands.get(interaction.commandName); // Getting the command name.
        if (!command) return; // Ending execution if the command name isn't a command from this bot.
        try {
            await command.execute(discordClient, interaction); // Executing the code of this command in the according file in the commands folder.
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    } else { // If the interaction is a non-command interaction.
        console.log(`${interaction.user.id} clicked on ${interaction.customId}`); // Logging the interaction to console.
        try {
            let twitterHandleInput, sweepPriceInput, prioInput, walletAddressInput, startDelayInput, keysHeld, proxyContractAddress, tx, txReceipt; // Declaring commonly used variables.
            switch (interaction.customId) { // Detecting for buttons being pressed.
                case `homeButton`:
                    await replySniperMenuEmbed(interaction);
                    break;
                case `createTaskButton`:
                    await replyTaskTypeEmbed(interaction);
                    break;
                case `createTaskTypeMenu`: // When an option from the task selection menu is pressed.
                    switch (interaction.values[0]) { // A switch case for the inputted interaction value.
                        case 'snipeTask': // If the user wants to create a snipeTask
                            await showCreateSnipeTaskModal(interaction);
                            break;
                        case 'spamTask': // If the user wants to create a spamTask.
                            let spamSettings = await getSpamSettings(interaction.user.id, `discord`); // Getting the users spam settings.
                            if (spamSettings.txPerSecond) { // Checking if the users spamSettings has txPerSecond to make sure they have set their settings.
                                await showCreateSpamTaskModal(interaction);
                            } else {
                                await updateNoSpamSettingsEmbed(interaction);
                            }
                            break;
                        case `mainMenu`:
                            await replySniperMenuEmbed(interaction);
                            break;
                    }
                    break;
                case `createSnipeTaskModal`:
                    twitterHandleInput = interaction.fields.components[0].components[0].value.trim(); // Extracting the twitter handle from the input
                    if (!twitterHandleInput.match(/\w+/) || twitterHandleInput > 15) { // If the twitter input was invalid.
                        await updateInvalidHandleInputEmbed(interaction, twitterHandleInput);
                        break;
                    } else {
                        twitterHandleInput = twitterHandleInput.match(/\w+/)[0];
                    }
                    sweepPriceInput = parseFloat(interaction.fields.components[1].components[0].value.trim());
                    if (!sweepPriceInput) { // If no sweepPrice was able to be grabbed from the modal.
                        await updateInvalidSweepPriceInputEmbed(interaction, interaction.fields.components[1].components[0].value.trim());
                        break;
                    }
                    prioInput = parseFloat(interaction.fields.components[2].components[0].value.trim()); // Parsing the float from the inputted string.
                    if (!prioInput) { // If no prio was able to be grabbed from the modal.
                        await updateInvalidPrioInputEmbed(interaction, interaction.fields.components[2].components[0].value.trim());
                        break;
                    }
                    // Code to add the task to the database.
                    await addSnipeTask(interaction.user.id, `discord`, twitterHandleInput, sweepPriceInput, prioInput);
                    await updateSnipeTaskAddedEmbed(interaction, twitterHandleInput, sweepPriceInput, prioInput);
                    break;
                case `createSpamTaskModal`:
                    twitterHandleInput = interaction.fields.components[0].components[0].value.trim(); // Extracting the twitter handle from the input
                    if (!twitterHandleInput.match(/\w+/) || twitterHandleInput > 15) { // If the twitter input was invalid.
                        await updateInvalidHandleInputEmbed(interaction, twitterHandleInput);
                        break;
                    } else {
                        twitterHandleInput = twitterHandleInput.match(/\w+/)[0];
                    }
                    sweepPriceInput = parseFloat(interaction.fields.components[1].components[0].value.trim());
                    if (!sweepPriceInput) { // If no sweepPriceInput was able to be grabbed from the modal.
                        await updateInvalidSweepPriceInputEmbed(interaction, interaction.fields.components[1].components[0].value.trim());
                        break;
                    }
                    await addSpamTask(interaction.user.id, `discord`, twitterHandleInput, sweepPriceInput);
                    await updateSpamTaskAddedEmbed(interaction, twitterHandleInput, sweepPriceInput);
                    break;
                case `inputSpamWalletButton`:
                    await showInputSpamWalletModal(interaction);
                    break;
                case `inputSpamWalletModal`:
                    twitterHandleInput = /\[@(.*?)\]/g.exec(interaction.message.embeds[0].description)[1]; // Extractring the old twitter handle with regex using the square brackets.
                    sweepPriceInput = parseFloat(/please input it with the button below to spam buy them up to \*\*([0-9.]+)\*\* ETH/.exec(interaction.message.embeds[0].description)[1]);
                    walletAddressInput = interaction.fields.components[0].components[0].value.toLowerCase().trim(); // Getting the wallet address input from the modal.
                    if (!/^(0x)?[0-9a-fA-F]{40}$/.test(walletAddressInput)) { // True if an invalid wallet address is inputted.
                        await updateInvalidWalletAddressInputEmbed(interaction, walletAddressInput); // updating with an invalid wallet embed.
                        break;
                    }
                    await addSpamTask(interaction.user.id, `discord`, twitterHandleInput, walletAddressInput, sweepPriceInput);
                    await updateSpamTaskAddedEmbed(interaction, twitterHandleInput, walletAddressInput, sweepPriceInput);
                    break;
                case `changeSpamTaskSweepPriceButton`:
                    await showChangeSpamTaskSweepPriceModal(interaction);
                    break;
                case `changeSpamTaskSweepPriceModal`:
                    twitterHandleInput = /\[@(.*?)\]/g.exec(interaction.message.embeds[0].description)[1]; // Extractring the old twitter handle with regex using the square brackets.
                    sweepPriceInput = parseFloat(interaction.fields.components[0].components[0].value.trim());
                    if (!sweepPriceInput) { // If no sweepPriceInput was able to be grabbed from the modal.
                        await updateInvalidSweepPriceInputEmbed(interaction, interaction.fields.components[1].components[0].value.trim());
                        break;
                    }
                    let spamTaskOldSweepPrice = await changeSpamTaskSweepPrice(interaction.user.id, `discord`, twitterHandleInput, sweepPriceInput)
                    if (spamTaskOldSweepPrice) {
                        await updateSpamTaskSweepPriceChangedEmbed(interaction, twitterHandleInput, sweepPriceInput, spamTaskOldSweepPrice);
                    } else {
                        await updateErrorEmbed(interaction);
                    }
                    break;
                case `manageTasksButton`: // Shows an embed asking what task group to manage.
                    await updateManageWhichTasksEmbed(interaction);
                    break;
                case `manageTaskTypeMenu`:
                    switch (interaction.values[0]) {
                        case `snipeTask`:
                            let snipeTasks = await getSnipeTasks(interaction.user.id, `discord`);
                            if (snipeTasks.length != 0) {
                                await updateManageSnipeTasksEmbed(interaction, snipeTasks, 1);
                            } else {
                                await updateNoSnipeTasksEmbed(interaction);
                            }
                            break;
                        case `spamTask`:
                            let spamTasks = await getSpamTasks(interaction.user.id, `discord`);
                            if (spamTasks.length != 0) { // If there are spam tasks, reply with an embed that lists 20 and has buttons to go to the next page.
                                await updateManageSpamTasksEmbed(interaction, spamTasks, 1);
                            } else {
                                await updateNoSpamTasksEmbed(interaction);
                            }
                            break;
                        case `mainMenu`:
                            await replySniperMenuEmbed(interaction);
                            break;
                    }
                    break;
                case `selectSnipeTaskMenu`:
                    twitterHandleInput = interaction.values[0].split(`-`)[0]; // Getting the wallet name by taking the string before the _ in the interaction value
                    sweepPriceInput = interaction.values[0].split(`-`)[1]; // Getting the sweep price by taking the second string separated by _s
                    prioInput = interaction.values[0].split(`-`)[2]; // Getting the prioInput by taking the third string separated by _s
                    await updateEditSnipeTaskEmbed(interaction, twitterHandleInput, sweepPriceInput, prioInput);
                    break;
                case `selectSpamTaskMenu`:
                    twitterHandleInput = interaction.values[0].split(`-`)[0]; // Getting the wallet name by taking the string before the - in the interaction value
                    sweepPriceInput = interaction.values[0].split(`-`)[1]; // Getting the wallet address by taking the string after the - in the interaction value
                    await updateEditSpamTaskEmbed(interaction, twitterHandleInput, sweepPriceInput);
                    break;
                case `changeSpamTaskWalletButton`:
                    await showChangeSpamTaskWalletModal(interaction);
                    break;
                case `changeSpamTaskWalletModal`:
                    twitterHandleInput = /\[@(.*?)\]/g.exec(interaction.message.embeds[0].description)[1]; // Extractring the old twitter handle with regex using the square brackets.
                    walletAddressInput = interaction.fields.components[0].components[0].value.toLowerCase().trim(); // Getting the wallet address input from the modal.
                    if (!/^(0x)?[0-9a-fA-F]{40}$/.test(walletAddressInput)) { // True if an invalid wallet address is inputted.
                        await updateInvalidWalletAddressInputEmbed(interaction, walletAddressInput); // updating with an invalid wallet embed.
                        break;
                    }
                    let spamTaskOldWallet = await changeSpamTaskWalletAddress(interaction.user.id, `discord`, twitterHandleInput, walletAddressInput); // Updating the database.
                    if (spamTaskOldWallet) {
                        await updateSpamTaskWalletChangedEmbed(interaction, twitterHandleInput, walletAddressInput);
                    } else {
                        await updateErrorEmbed(interaction);
                    }
                    break;
                case `deleteSpamTaskButton`:
                    twitterHandleInput = /\[@(.*?)\]/g.exec(interaction.message.embeds[0].description)[1]; // Extractring the old twitter handle with regex using the square brackets.
                    let removedSpamTaskHandle = await removeSpamTask(interaction.user.id, `discord`, twitterHandleInput);
                    if (removedSpamTaskHandle) {
                        await updateSpamTaskRemovedEmbed(interaction, removedSpamTaskHandle);
                    } else {
                        await updateErrorEmbed(interaction);
                    }
                    break;
                case `inputSpamSettingsButton`:
                    await showSpamSettingsModal(interaction);
                    break;
                case `spamSettingsModal`:
                    txPerSecondInput = parseInt(interaction.fields.components[0].components[0].value.trim());
                    if (!txPerSecondInput || txPerSecondInput > 15) { // If no txPerSecondInput was able to be parsed from the modal.
                        await updateInvalidTxPerSecondInputEmbed(interaction, interaction.fields.components[0].components[0].value.trim());
                        break;
                    }
                    startDelayInput = parseInt(interaction.fields.components[1].components[0].value.trim());
                    if (!startDelayInput || startDelayInput < 0) { // If no startDelayInput was able to be parsed from the modal.
                        await updateInvalidStartDelayInputEmbed(interaction, interaction.fields.components[1].components[0].value.trim());
                        break;
                    }
                    durationInput = parseInt(interaction.fields.components[2].components[0].value.trim());
                    if (!durationInput || durationInput < 0 || durationInput > 120) { // If no durationInput was able to be parsed from the modal.
                        await updateInvalidDurationInputEmbed(interaction, interaction.fields.components[0].components[0].value.trim());
                        break;
                    }
                    await setSpamSettings(interaction.user.id, `discord`, txPerSecondInput, startDelayInput, durationInput); // returns user if successful
                    await updateSpamSettingsSavedEmbed(interaction, txPerSecondInput, startDelayInput, durationInput);
                    break;
                case `searchSpamTasksButton`:
                    await showSearchSpamTasksModal(interaction);
                    break;
                case `searchSpamTasksModal`:
                    twitterHandleInput = interaction.fields.components[0].components[0].value.trim(); // Extracting the twitter handle from the input
                    if (!twitterHandleInput.match(/\w+/) || twitterHandleInput > 15) { // If the twitter input was invalid.
                        await updateInvalidHandleInputEmbed(interaction, twitterHandleInput);
                        break;
                    } else {
                        twitterHandleInput = twitterHandleInput.match(/\w+/)[0];
                    }
                    let spamTask = await getSpamTask(interaction.user.id, `discord`, twitterHandleInput);
                    if (spamTask) {
                        await updateEditSpamTaskEmbed(interaction, twitterHandleInput, spamTask.wallet_address);
                    } else {
                        await updateNoSpamTaskFoundEmbed(interaction, twitterHandleInput);
                    }
                    break;
                case `changeSnipeTaskSweepPriceButton`:
                    await showChangeSnipeTaskSweepPriceModal(interaction);
                    break;
                case `changeSnipeTaskSweepPriceModal`:
                    sweepPriceInput = parseFloat(interaction.fields.components[0].components[0].value.trim());
                    if (!sweepPriceInput) { // If no sweepPrice was able to be grabbed from the modal.
                        await updateInvalidSweepPriceInputEmbed(interaction, interaction.fields.components[0].components[0].value);
                        break;
                    }
                    twitterHandleInput = /\[@(.*?)\]/g.exec(interaction.message.embeds[0].description)[1]; // Extractring the old twitter handle with regex using the square brackets.
                    let oldSweepPrice = await changeSnipeTaskSweepPrice(interaction.user.id, `discord`, twitterHandleInput, sweepPriceInput); // Modifying database
                    if (oldSweepPrice) {
                        await updateSnipeTaskSweepPriceChangedEmbed(interaction, twitterHandleInput, sweepPriceInput, oldSweepPrice);
                    } else {
                        await updateErrorEmbed(interaction);
                    }
                    break;
                case `changeSnipeTaskPrioButton`:
                    await showChangeSnipeTaskPrioModal(interaction);
                    break;
                case `changeSnipeTaskPrioModal`:
                    prioInput = parseFloat(interaction.fields.components[0].components[0].value.trim()); // Parsing the float from the inputted string.
                    twitterHandleInput = /\[@(.*?)\]/g.exec(interaction.message.embeds[0].description)[1]; // Extractring the old twitter handle with regex using the square brackets.
                    if (!prioInput) { // If no prio was able to be grabbed from the modal.
                        await updateInvalidPrioInputEmbed(interaction, interaction.fields.components[0].components[0].value.trim());
                        break;
                    }
                    let oldPrio = await changeSnipeTaskPrio(interaction.user.id, `discord`, twitterHandleInput, prioInput);
                    if (oldPrio) {
                        await updateSnipeTaskPrioChangedEmbed(interaction, twitterHandleInput, prioInput, oldPrio);
                    } else {
                        await updateErrorEmbed(interaction);
                    }

                    break;
                case `searchSnipeTasksButton`:
                    await showSearchSnipeTaskModal(interaction);
                    break;
                case `searchSnipeTaskModal`:
                    twitterHandleInput = interaction.fields.components[0].components[0].value.trim(); // Extracting the twitter handle from the input
                    if (!twitterHandleInput.match(/\w+/) || twitterHandleInput > 15) { // If the twitter input was invalid.
                        await updateInvalidHandleInputEmbed(interaction, twitterHandleInput);
                        break;
                    } else {
                        twitterHandleInput = twitterHandleInput.match(/\w+/)[0];
                    }
                    let snipeTask = await getSnipeTask(interaction.user.id, `discord`, twitterHandleInput);
                    if (snipeTask) {
                        twitterHandleInput = snipeTask.twitter_handle;
                        sweepPriceInput = snipeTask.sweepPrice;
                        prioInput = snipeTask.prio;
                        await updateEditSnipeTaskEmbed(interaction, twitterHandleInput, sweepPriceInput, prioInput);
                    } else {
                        await updateNoSnipeTaskFoundEmbed(interaction, twitterHandleInput);
                    }
                    break;
                case `deleteSnipeTaskButton`:
                    twitterHandleInput = /\[@(.*?)\]/g.exec(interaction.message.embeds[0].description)[1]; // Extractring the old twitter handle with regex using the square brackets.
                    let removedSnipeTaskHandle = await removeSnipeTask(interaction.user.id, `discord`, twitterHandleInput);
                    if (removedSnipeTaskHandle) {
                        await updateSnipeTaskRemovedEmbed(interaction, removedSnipeTaskHandle);
                    } else {
                        await updateErrorEmbed(interaction);
                    }
                    break;
                case `sellKeysButton`:
                    await updateSellFromSelectionEmbed(interaction);
                    break;
                case `sellFromMenu`:
                    let sellMenuOption = interaction.values[0];
                    switch (sellMenuOption) {
                        case `wallet`:
                            walletAddressInput = await getWalletAddress(interaction.user.id, `discord`); // Getting the users wallet address from the database.
                            keysHeld = await kosettoHoldingsCall(walletAddressInput);  // Getting the keys the user is holding
                            if (keysHeld != undefined) { // If you have keys.
                                await updateWalletSellingEmbed(interaction, keysHeld.users, 1); // Sending the embed with pages to see held keys.
                            } else {
                                await updateNoKeysHeldWalletEmbed(interaction); // Sending an embed saying you have no keys in this wallet.
                            }
                            break;
                        case `proxyContract`:
                            let proxyContractAddress = await getProxyContract(interaction.user.id, `discord`); // Getting the users proxy contract from the database.
                            if (proxyContractAddress == ``) {
                                await updateProxyNotFoundEmbed(interaction);
                            } else {
                                keysHeld = await kosettoHoldingsCall(proxyContractAddress);  // Getting the keys the user is holding
                                if (keysHeld.users.length != 0) { // If you have keys.
                                    await updateContractSellingEmbed(interaction, keysHeld.users, 1); // Sending the embed with pages to see held keys.
                                } else {
                                    await updateNoKeysHeldContractEmbed(interaction); // Sending an embed saying you have no keys in this contract.
                                }
                            }
                            break;
                        case `mainMenu`:
                            await replySniperMenuEmbed(interaction);
                            break;
                    }
                    break;
                case `selectWalletSellingMenu`:
                    twitterHandleInput = interaction.values[0].split(`-`)[0]; // Getting the twitterHandleInput by taking the string before the _ in the interaction value
                    keyAddressInput = interaction.values[0].split(`-`)[1]; // Getting the walletAddressInput by taking the second string separated by _s
                    keyBalance = interaction.values[0].split(`-`)[2]; // Getting the keyBalance by taking the third string separated by _s
                    let walletAddress = await getWalletAddress(interaction.user.id, `discord`);
                    await updateWalletSellKeyEmbed(interaction, twitterHandleInput, keyAddressInput, walletAddress, keyBalance);
                    break;
                case `selectContractSellingMenu`:
                    twitterHandleInput = interaction.values[0].split(`-`)[0]; // Getting the twitterHandleInput by taking the string before the _ in the interaction value
                    keyAddressInput = interaction.values[0].split(`-`)[1]; // Getting the walletAddressInput by taking the second string separated by _s
                    keyBalance = interaction.values[0].split(`-`)[2]; // Getting the keyBalance by taking the third string separated by _s
                    let proxyContractAddress = await getProxyContract(interaction.user.id, `discord`);
                    await updateContractSellKeyEmbed(interaction, twitterHandleInput, keyAddressInput, proxyContractAddress, keyBalance);
                    break;
                case `searchContractSellingButton`:
                    await showSearchContractSellModal(interaction);
                    break;
                case `searchContractSellModal`:
                    twitterHandleInput = interaction.fields.components[0].components[0].value.trim(); // Extracting the twitter handle from the input
                    if (!twitterHandleInput.match(/\w+/) || twitterHandleInput > 15) { // If the twitter input was invalid.
                        await updateInvalidHandleInputEmbed(interaction, twitterHandleInput);
                        break;
                    } else {
                        twitterHandleInput = twitterHandleInput.match(/\w+/)[0];
                    }
                    proxyContractAddress = `0x414c102fee272844a8afb817464942e101034e38`; // Getting the users proxy contract from the database.    
                    keysHeld = await kosettoHoldingsCall(proxyContractAddress);  // Getting the keys the user is holding
                    if (keysHeld.users.length > 0) { // If the wallet isn't empty
                        for (const user of keysHeld.users) {
                            if (user.twitterUsername.toLowerCase() === twitterHandleInput.toLowerCase()) { // If the inputted twitter is in the contracts inventory.
                                await updateContractSellKeyEmbed(interaction, twitterHandleInput, user.address.toLowerCase(), proxyContractAddress, user.balance);
                                return;
                            }
                        }
                        await updateContractDoesntOwnKeyEmbed(interaction,)
                        // If the users contract doesn't hold that key.
                    } else {
                        await updateNoKeysHeldContractEmbed(interaction); // Sending an embed saying you have no keys in this contract.
                    }
                    break;
                case `settingsButton`:
                    await updateSettingsEmbed(interaction);
                    break;
                case `inputPrivateKeyButton`:
                    await updateConfirmPrivateKeyEmbed(interaction);
                    break;
                case `confirmPrivateKeyButton`:
                    await showInputPrivateKeyModal(interaction);
                    break;
                case `showInputPrivateKeyModal`:
                    let success = await storeIdentifier(interaction.user.id, `discord`, interaction.fields.components[0].components[0].value.trim());
                    if (success) {
                        await updateWalletStoredEmbed(interaction, success.address);
                    } else {
                        await updateInvalidPKEmbed(interaction);
                    }
                    break;
                case `setSpamSettingsButton`:
                    await showSpamSettingsModal(interaction);
                    break;
                case `deleteMyDataButton`:
                    removeUser(interaction.user.id, `discord`);
                    updateDataDeletedEmbed(interaction);
                    break;
                case `deployProxyContractButton`:
                    await updateDeployProxyContractEmbed(interaction);
                    break;
                case `deployProxyContractConfirmButton`:
                    tx = await deployWithPrivateKey(interaction);// Code to send transaction to deploy contract here
                    console.log(tx)
                    await updateDeployPendingTransaction(interaction, tx.hash);
                    txReceipt = await tx.wait();
                    if (txReceipt.status === 1) {
                        let walletAddress = getWalletAddress(interaction.user.id, `discord`);
                        let deployedAddress = await friendTechRouterContract.friendTechBotMap(walletAddress); // Get the deployed contract address from the mapping
                        await updateDeployConfirmedEmbed(interaction, deployedAddress, tx.hash);
                        await setProxyContract(interaction.user.id, `discord`, deployedAddress)
                        console.log('Transaction confirmed!');
                    } else {
                        await updateDeployFailedEmbed(interaction, tx.hash);
                        console.log('Transaction failed!');
                    }
                    break;
                case `confirmWalletBuyButton`:
                    console.log(interaction.message.embeds[0].description);
                    const keyAmount = interaction.message.embeds[0].description.match(/\*\*(.*?)\*\*/)[1];
                    const totalCost = interaction.message.embeds[0].description.match(/__\*\*(.*?)\*\*__/)[1];
                    walletAddressInput = interaction.message.embeds[0].description.match(/0x[0-9a-fA-F]{40}/g)[0];
                    twitterHandleInput = /\[@(.*?)\]/g.exec(interaction.message.embeds[0].description)[1]; // Extractring the old twitter handle with regex using the square brackets.
                    console.log(`keyAmount: ${keyAmount}, totalCost: ${totalCost}, walletAddressInput: ${walletAddressInput}, twitterHandleInput: ${twitterHandleInput}`)
                    tx = await sendWalletBuyTransaction(interaction, totalCost, walletAddressInput, keyAmount);
                    if (tx == null) return;
                    await updatePendingBuyTransactionEmbed(interaction, `wallet`, totalCost, walletAddressInput, keyAmount, twitterHandleInput, tx.hash);
                    try {
                        txReceipt = await tx.wait();
                        if (txReceipt.status === 1) {
                            await updateBuyTransactionConfirmedEmbed(interaction, `wallet`, totalCost, walletAddressInput, keyAmount, twitterHandleInput, tx.hash);
                            console.log('Transaction confirmed!');
                        } else {
                            await updateBuyTransactionFailedEmbed(interaction, `wallet`, totalCost, walletAddressInput, keyAmount, twitterHandleInput, tx.hash);
                            console.log('Transaction failed!');
                        }
                    } catch (error) {
                        await updateBuyTransactionFailedEmbed(interaction, `wallet`, totalCost, walletAddressInput, keyAmount, twitterHandleInput, tx.hash);
                        console.log('Transaction failed!');
                        console.log(error)
                    }
                    break;
                case `withdrawButton`:
                    let withdrawTx = await withdrawFromBot(interaction);
                    console.log(withdrawTx)
                    if (withdrawTx == undefined) {
                        await updateErrorEmbed(interaction);
                        return;
                    }
                    let proxyContract = await getProxyContract(interaction.user.id, `discord`);
                    await updatePendingWithdrawTransactionEmbed(interaction, proxyContract, withdrawTx.hash); // Sending pending tx embed.
                    await withdrawTx.wait(); // Waiting for the transaction to confirm.
                    await updateWithdrawTransactionConfirmedEmbed(interaction, proxyContract, withdrawTx.hash); // Sending the embed when it confirms.
                    break;
                case `depositButton`:
                    await showDepositModal(interaction); // Shows the deposit Modal
                    break;
                case `inputDepositModal`:
                    let depositAmount = parseFloat(interaction.fields.components[0].components[0].value.trim()); // Extracting the ETH amount to deposit from the modal.
                    if (!isNaN(depositAmount)) { // Makes sure the inputted value is a valid number.
                        let walletAddress = await getWalletAddress(interaction.user.id, `discord`); // Getting the user's wallet address.
                        let baseBalance = await getBalance(baseProvider, walletAddress); // Getting the base balance of the users wallet.
                        if (depositAmount < baseBalance) {
                            let proxyContractAddress = await getProxyContract(interaction.user.id, `discord`);
                            console.log(`Sending ${interaction.user.tag}'s transaction to deposit ${depositAmount} ETH into contract.`);
                            let depositTx = await sendDepositTransaction(interaction, depositAmount); // If the deposit amount is less than the users balance, send the transaction.
                            await updatePendingDepositTransactionEmbed(interaction, proxyContractAddress, depositTx.hash, depositAmount); // Sending the transaction to deposit.
                            await depositTx.wait(); // Waiting for transaction to confirm.
                            await updateDepositTransactionConfirmedEmbed(interaction, proxyContractAddress, depositTx.hash, depositAmount);
                        } else {
                            await updateNotEnoughEthEmbed(interaction, baseBalance, depositAmount, walletAddress); // If the deposit amount is more than the users balance, send an error embed.
                        }
                    } else {
                        await updateInvalidDepositAmountEmbed(interaction, interaction.fields.components[0].components[0].value.trim());// Sending an embed saying the eth value isn't valid.
                    }
                    break;
            }
            if (interaction.customId.startsWith(`pageButton`)) { // If the interaction was a page button being pressed.
                let pageMenu = interaction.customId.split(`_`)[1]; // Splitting the interaction customid to get the pageMenu where the button was pressed.
                let newPage = interaction.customId.split(`_`)[2]; // Splitting the interaction customID to get the new page.
                let keysHeld;
                switch (pageMenu) {
                    case `SnipeTasks`:
                        let snipeTasks = await getSnipeTasks(interaction.user.id, `discord`); // Getting the users snipe tasks
                        if (snipeTasks.length == 0) { // If the user has no snipe tasks, return the no snipe tasks embed.
                            await updateNoSnipeTasksEmbed(interaction);
                        } else { // If there are snipe tasks, reply with an embed that lists 20 and has buttons to go to the next page.
                            await updateManageSnipeTasksEmbed(interaction, snipeTasks, newPage);
                        }
                        break;
                    case `SpamTasks`:
                        let spamTasks = await getSpamTasks(interaction.user.id, `discord`); // Getting the users spam tasks
                        if (spamTasks.length == 0) { // If the user has no spam tasks, return the no spam tasks embed.
                            await updateNoSpamTasksEmbed(interaction);
                        } else { // If there are spam tasks, reply with an embed that lists 20 and has buttons to go to the next page.
                            await updateManageSpamTasksEmbed(interaction, spamTasks, newPage);
                        }
                        break;
                    case `ContractSelling`:
                        let proxyContractAddress = await getProxyContract(interaction.user.id, `discord`); // Getting the users proxy contract from the database.
                        keysHeld = await kosettoHoldingsCall(proxyContractAddress); // Getting the keys the user is holding
                        if (keysHeld.users.length == 0) {
                            await updateNoKeysHeldContractEmbed(interaction); // Sending an embed saying you have no keys in this contract.
                        } else {
                            await updateContractSellingEmbed(interaction, keysHeld.users, newPage); // Sending the embed with pages to see held keys.
                        }
                        break;
                    case `WalletSelling`:
                        let walletAddress = await getWalletAddress(interaction.user.id, `discord`); // Getting the users proxy contract from the database.
                        keysHeld = await kosettoHoldingsCall(walletAddress); // Getting the keys the user is holding
                        if (keysHeld.users.length == 0) {
                            await updateNoKeysHeldContractEmbed(interaction); // Sending an embed saying you have no keys in this contract.
                        } else {
                            await updateWalletSellingEmbed(interaction, keysHeld.users, newPage); // Sending the embed with pages to see held keys.
                        }
                        break;
                }
            }
            if (interaction.customId.startsWith(`ContractSell`)) { // If the button pressed was a contract sell button.
                let keyAddress = interaction.customId.split(`-`)[1]; // Splitting the interaction customid to get the pageMenu where the button was pressed.
                let sellAmount = parseInt(interaction.customId.split(`-`)[2]); // Splitting the interaction customID to get the new page.
                twitterHandleInput = /\[@(.*?)\]/g.exec(interaction.message.embeds[0].description)[1]; // Extractring the old twitter handle with regex using the square brackets.
                proxyContractAddress = await getProxyContract(interaction.user.id, `discord`); // Getting the users proxy contract.
                let sellTx = await sendContractSellTransaction(interaction, keyAddress, sellAmount); // This should be replaced with sending the sell transaction, returns transactionHash if it is suceessfully sent.
                await sendContractSellPendingEmbed(interaction, keyAddress, sellAmount, twitterHandleInput, proxyContractAddress, sellTx.hash); // Sending the tx to sell from contract.
                let txReceipt = await sellTx.wait(); // Waiting for the sell transaction to confirm.
                const iface = new ethers.utils.Interface(friendTechContractABI);
                console.log(txReceipt)
                if (txReceipt.logs.length === 1) {
                    const parsedLog = iface.parseLog(txReceipt.logs[0]);

                    await sendContractSellConfirmedEmbed(interaction, keyAddress, sellAmount, twitterHandleInput, proxyContractAddress, sellTx.hash, ethers.utils.formatUnits(parsedLog.args.ethAmount.toString(), `ether`));
                    console.log('Contract Sell Transaction confirmed!');
                } else {
                    console.log("Contract Sell Failed")
                    //await sendContractSellFaile
                }

            }
            if (interaction.customId.startsWith(`WalletBuy`)) { // If the button pressed was a wallet buy button.
                const member = await interaction.guild.members.fetch(interaction.user.id);
                if (!member.roles.cache.has(HOLDER_ROLE)) { // If the member doesn't have the role.
                    await replyRoleRequiredEmbed(interaction, HOLDER_ROLE);
                    return;
                }
                let keyAddress = interaction.customId.split(`-`)[1]; // Splitting the interaction customid to get the pageMenu where the button was pressed.
                let buyAmount = parseInt(interaction.customId.split(`-`)[2]); // Splitting the interaction customID to get the new page.
                twitterHandleInput = /\[@(.*?)\]/g.exec(interaction.message.embeds[0].description)[1]; // Extractring the old twitter handle with regex using the square brackets.
                await replyConfirmWalletBuyEmbed(interaction, keyAddress, buyAmount, twitterHandleInput);
            }
            if (interaction.customId.startsWith(`WalletSell`)) { // If the button pressed was a wallet sell button
                const member = await interaction.guild.members.fetch(interaction.user.id);
                if (!member.roles.cache.has(HOLDER_ROLE)) { // If the member doesn't have the role.
                    await replyRoleRequiredEmbed(interaction, HOLDER_ROLE);
                    return;
                }
                let keyAddress = interaction.customId.split(`-`)[1]; // Splitting the interaction customid to get the pageMenu where the button was pressed.
                let sellAmount = parseInt(interaction.customId.split(`-`)[2]); // Splitting the interaction customID to get the new page.
                twitterHandleInput = /\[@(.*?)\]/g.exec(interaction.message.embeds[0].description)[1]; // Extractring the old twitter handle with regex using the square brackets.
                tx = await sendWalletSellTransaction(interaction, keyAddress, sellAmount);
                if (tx == null) return;
                await updatePendingSellTransactionEmbed(interaction, `wallet`, keyAddress, sellAmount, twitterHandleInput, tx.hash);
                txReceipt = await tx.wait();
                if (txReceipt.status === 1) {
                    let ethBeforeFees = Number(txReceipt.events[0].args.ethAmount);
                    let ethAfterFees = Number(txReceipt.events[0].args.ethAmount) - Number(txReceipt.events[0].args.protocolEthAmount) - Number(txReceipt.events[0].args.subjectEthAmount);
                    await updateSellTransactionConfirmedEmbed(interaction, `wallet`, keyAddress, sellAmount, ethers.utils.formatUnits(ethBeforeFees.toString(), `ether`), ethers.utils.formatUnits(ethAfterFees.toString(), `ether`), twitterHandleInput, tx.hash);
                    console.log('Transaction confirmed!');
                } else {
                    await updateSellTransactionFailedEmbed(interaction, `wallet`, keyAddress, sellAmount, twitterHandleInput, tx.hash);
                    console.log('Transaction failed!');
                }
            }
            if (interaction.customId.startsWith(`startSpamTask`)) { // If the button pressed starts with startSpamTask
                const member = await interaction.guild.members.fetch(interaction.user.id);
                if (!member.roles.cache.has(ADMIN_ROLE)) { // If the member doesn't have the role.
                    await replyNotReadyEmbed(interaction, ADMIN_ROLE);
                    return;
                }
                let keyValue = interaction.customId.split(`-`)[1];
                if (keyValue == `PriceInput`) {
                    console.log(`PRICE INPUT MODAL`)
                }
                let keyAddress = interaction.customId.split(`-`)[2];
                let twitterHandle = interaction.customId.split(`-`)[3];
                console.log(`keyValue: ${keyValue}, keyAddress: ${keyAddress}, twitterHandle: ${twitterHandle}`)
            }
        } catch (error) {
            console.log(`${interaction.user.id} just crashed the bot by calling ${interaction.customId}`);
            await dmCrashPreventedEmbed(discordClient, interaction);
        }
    }
});

discordClient.login(process.env.DISCORD_TOKEN); // Logging into the discord bot.

module.exports = {};