const ethers = require(`ethers`);
const fs = require('fs');

const { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, WebhookClient } = require('discord.js');
const { taskTypeOptions, createTaskButton, manageTasksButton, sellKeysButton, settingsButton, getPageButtonsRow, deleteSpamTaskButton, homeButton,
    inputSpamSettingsButton, changeSnipeTaskSweepPriceButton, changeSnipeTaskPrioButton, deleteSnipeTaskButton, getSellButtonsRow, inputSpamWalletButton, changeSpamTaskSweepPriceButton,
    inputPrivateKeyButton, deployProxyContractButton, setSpamSettingsButton, confirmPrivateKeyButton, deleteMyDataButton, deployProxyContractConfirmButton, getBuyButtonsRow, sellFromOptions,
    depositButton, withdrawButton, getQuickSpamButtonsRow
} = require(`./buttonCreator.js`);
const { getBaseBalance } = require(`./networkFunctions.js`);
const { getInfo, getTwitterInfo } = require(`./apiCalls.js`);
const { getWalletAddress, getSpamSettings, getProxyContract, getTwitter, setProxyContract, setSpamSettings } = require(`./dataHandler.js`);
const { getFriendTechBotAddress } = require(`./networkFunctions.js`);

const BALANCE_CHECKER_CONTRACT = `0x8cd6740d42509f09076c50eb3e7f45ab3fce6f6c`;
const BalanceCheckerABI = require("./abi/BalanceCheckerABI.json");
const baseProvider = new ethers.providers.JsonRpcProvider("https://base-mainnet.g.alchemy.com/v2/3jvxo1TC_IJ28e-SmuOULOlJJtzF6hCL");
const balanceCheckerContract = new ethers.Contract(BALANCE_CHECKER_CONTRACT, BalanceCheckerABI, baseProvider);

const webhookClient = new WebhookClient({ url: `https://discord.com/api/webhooks/1143140032903921754/RuvuOnYg-vAmkJCATpky4LKOYp2-mPwtnABIQYbcjUEqBd_1a20Bu0UaH2ma_c4Mpr2R` });

function createDefaultEmbed() { // A function to create a default Unchained embed.
    let defaultEmbed = new EmbedBuilder()
        .setColor('#ff045f')
        .setTimestamp()
        .setFooter({ text: "Unchained", iconURL: "https://cdn.discordapp.com/attachments/888244235407605800/1080223489224626308/UNCHAINED_AGENCY_LOGO_TWITTER_PROFILE_PICTURE_CIRCLE.png" });
    return defaultEmbed;
}

async function replySniperMenuEmbed(interaction) { // Replies the sniper menu embed.
    let proxyContractAddress = await getProxyContract(interaction.user.id, `discord`); // Getting the proxy contract address.
    let proxyContractString = ``;
    if (proxyContractAddress != ``) { // If the user has indeed deployed their proxy contract.
        let baseBalance = await getBaseBalance(proxyContractAddress, baseProvider);
        if (baseBalance == 0) {
            proxyContractString = `\nYour **[proxy contract](https://basescan.org/address/${proxyContractAddress})** is currently empty! Deposit some ETH before attempting a snipe.\n`;
        } else {
            proxyContractString = `\nYour **[proxy contract](https://basescan.org/address/${proxyContractAddress})** currently has **${baseBalance}** ETH in it and is ready to snipe!\n`;
        }
    } else {
        proxyContractString = `\nYou have not yet deployed a proxy contract, be sure to do so in the settings before trying to snipe anything.\n`;
    }
    let sniperMenuEmbed = createDefaultEmbed()
        .setDescription(`# Unchained Sniper
    \nWelcome to the **[Friend.Tech](https://friend.tech)** Sniper by **[Unchained](https://twitter.com/unchainedaio)**.
    ${proxyContractString}\nSelect an option down below to get sniping!`);
    let sniperMenuMessage = {
        embeds: [sniperMenuEmbed],
        components: [{
            type: 1,
            components: [createTaskButton, manageTasksButton, sellKeysButton, settingsButton],
        }],
        ephemeral: true
    };
    if (proxyContractString != '') {
        let additionalActionRow = new ActionRowBuilder(); // Create a new action row
        additionalActionRow.addComponents(depositButton, withdrawButton);
        sniperMenuMessage.components.push(additionalActionRow); // Add the additional action row to the components array in sniperMenuMessage
    }
    if (interaction.customId == `homeButton`) {
        await interaction.update(sniperMenuMessage);
    } else {
        await interaction.reply(sniperMenuMessage);
    }
}

async function sendWelcomeEmbed(discordClient) {
    const WELCOME_CHANNEL_ID = `1153074249754497034`;
    let welcomeEmbed = createDefaultEmbed()
        .setDescription(`# Welcome to Friend.Tech by Unchained!
    \nWelcome to Friend.Tech by Unchained. This server contains monitors for everything you may need such as:
    \n- New Sign-ups
    \n- 3,3 Buyers
    \n- First Buys
    \n- Self Buys
    \n- Bridge Funding
    \n- Failed Snipes
    \n- More to come!

    While there are plenty of free channels, the majority of them require you to hold a key of [Shady](https://www.friend.tech/rooms/0x414c102fee272844a8afb817464942e101034e38), [Billionaire](https://www.friend.tech/rooms/0x3d079438778d779e4fbbd36f9a573eb9364fd702), or one of our Partners. Partnered keyholders do not get access to the bot or any sort of automations and only have access to view the monitors.
    
    For the forseeable future, the **sniper** will remain as being __Shady and Billionaire Keyholders Only__.
    \nThe sniper supports two types of tasks:
    - **Snipe Tasks**: Users specify the Twitter Handles that they want to snipe along with the price they want to sweep keys up to along with the priority fee they want to pay. This aims to buy keys in block 1 - the first block after the specified user buys their keys.
    \n- **Spam Tasks**: Users specify Twitter Handles that they want to snipe and the price they want to sweep the shares up to. This mode spams transactions with the same gas that Friend.Tech will be using so there is no need for a gas input. This aims to buy keys in block 0. Users also have settings for their spam tasks that determine the frequency of which transactions are sent along with duration and start time.
    \n\nIt goes without being said that we are here to provide support to Key holders so if you have any features you would like to see implemented, let us know!`);
    const channel = discordClient.channels.cache.get(WELCOME_CHANNEL_ID); // Getting the channel to send the embed to
    channel.send({ embeds: [welcomeEmbed] }); // Sending the embed
}

async function replyAdminOnlyEmbed(interaction) { // Replies an embed if the user interacting isn't administrator.
    let adminOnlyEmbed = createDefaultEmbed()
        .setDescription(`# This command is for administrators only!`);
    await interaction.editReply({
        embeds: [adminOnlyEmbed],
        ephemeral: true
    });
}

async function replyTaskTypeEmbed(interaction) { // Replies an embed asking for the task type.
    let taskTypeEmbed = createDefaultEmbed()
        .setDescription(`# What kind of task do you want to create?
        \nSelect an option from the dropdown below.`);
    let taskTypeMenu = new StringSelectMenuBuilder() // Creating the select menu
        .setCustomId('createTaskTypeMenu')
        .setPlaceholder('What kind of task do you want to create?')
        .addOptions(taskTypeOptions);
    let firstActionRow = new ActionRowBuilder().addComponents(taskTypeMenu); // Creating the action row.
    await interaction.reply({
        embeds: [taskTypeEmbed],
        components: [firstActionRow],
        ephemeral: true
    });
}

async function updateSnipeTaskAddedEmbed(interaction, twitterHandleInput, sweepPriceInput, prioInput) {
    let snipeTaskAddedEmbed = createDefaultEmbed()
        .setDescription(`# Snipe Task Created
    \nYou have added a task to snipe **[@${twitterHandleInput}](https://twitter.com/${twitterHandleInput})**'s keys up to **${sweepPriceInput}** ETH at **${prioInput}** Gwei.`);
    interaction.update({
        embeds: [snipeTaskAddedEmbed],
        components: [{
            type: 1,
            components: [createTaskButton, manageTasksButton, sellKeysButton, settingsButton]
        }],
        ephemeral: true
    })
}

async function updateSpamTaskAddedEmbed(interaction, twitterHandleInput, sweepPriceInput) {
    let spamTaskAddedEmbed = createDefaultEmbed()
        .setDescription(`# Spam Task Created
    \nYou have added a task to spam buy **[@${twitterHandleInput}](https://twitter.com/${twitterHandleInput})**'s keys up to **${sweepPriceInput}**.`);
    interaction.update({
        embeds: [spamTaskAddedEmbed],
        components: [{
            type: 1,
            components: [createTaskButton, manageTasksButton, sellKeysButton, settingsButton]
        }],
        ephemeral: true
    })
}

async function updateManageWhichTasksEmbed(interaction) { // Updates the current embed to ask which task someone wants to edit.
    let manageWhichTasksEmbed = createDefaultEmbed()
        .setDescription(`# What kind of task do you want to edit?
        \nSelect an option in the menu below.`);
    let taskTypeMenu = new StringSelectMenuBuilder() // Creating the select menu
        .setCustomId('manageTaskTypeMenu')
        .setPlaceholder('Which type of task do you want to manage?')
        .addOptions(taskTypeOptions);
    let firstActionRow = new ActionRowBuilder().addComponents(taskTypeMenu); // Creating the action row.
    await interaction.update({
        embeds: [manageWhichTasksEmbed],
        components: [firstActionRow],
        ephemeral: true
    });
}

async function updateSpamSettingsSavedEmbed(interaction, txPerSecondInput, startDelayInput, durationInput) { // Updates the embed with the saved spam settings.
    let spamSettingsSavedEmbed = createDefaultEmbed()
        .setDescription(`# Spam Settings Saved!
    \nYour spam tasks will spam **${txPerSecondInput}** transactions per second for **${durationInput}** seconds, starting **${startDelayInput}** seconds after friend.tech account receives funding.`);
    interaction.update({
        embeds: [spamSettingsSavedEmbed],
        components: [{
            type: 1,
            components: [createTaskButton, manageTasksButton, sellKeysButton, settingsButton]
        }],
        ephemeral: true
    })
}

// EMBEDS FOR INVALID INPUTS

async function updateInvalidHandleInputEmbed(interaction, twitterHandleInput) { // Replies an embed saying the twitter handle input isn't correct.
    let invalidHandleEmbed = createDefaultEmbed()
        .setDescription(`# Invalid Twitter Handle
    \n\`${twitterHandleInput}\` is not a valid input - Please try again.`);
    interaction.update({
        embeds: [invalidHandleEmbed],
        components: [{
            type: 1,
            components: [createTaskButton, manageTasksButton, sellKeysButton, settingsButton]
        }],
        ephemeral: true
    });
}

async function updateInvalidSweepPriceInputEmbed(interaction, priceInput) { // Updates the embed to say the price input was wrong
    let invalidSweepPriceInputEmbed = createDefaultEmbed()
        .setDescription(`# Invalid Sweep Price Input
\n\`${priceInput}\` is not a valid input. Please input a decimal number.`);
    interaction.update({
        embeds: [invalidSweepPriceInputEmbed],
        components: [{
            type: 1,
            components: [createTaskButton, manageTasksButton, sellKeysButton, settingsButton]
        }],
        ephemeral: true
    });
}

async function updateInvalidPrioInputEmbed(interaction, prioInput) { // Updates the embed to say the prio input was wrong
    let invalidPrioEmbed = createDefaultEmbed()
        .setDescription(`# Invalid Priority Input
\n\`${prioInput}\` is not a valid input. Please input a decimal number.`);
    interaction.update({
        embeds: [invalidPrioEmbed],
        components: [{
            type: 1,
            components: [createTaskButton, manageTasksButton, sellKeysButton, settingsButton]
        }],
        ephemeral: true
    });
}

async function updateInvalidWalletAddressInputEmbed(interaction, walletAddressInput) { // Updates the embed to say the wallet address input was wrong
    let invalidWalletAddressInputEmbed = createDefaultEmbed()
        .setDescription(`# Invalid Address Input
\n\`${walletAddressInput}\` is not a valid Wallet Address. Please try again.`);
    interaction.update({
        embeds: [invalidWalletAddressInputEmbed],
        components: [{
            type: 1,
            components: [createTaskButton, manageTasksButton, sellKeysButton, settingsButton]
        }],
        ephemeral: true
    });
}

async function updateInvalidTxPerSecondInputEmbed(interaction, txPerSecondInput) { // Updates the embed to say that txPerSecond is invalid.
    let invalidTxPerSecondInput = createDefaultEmbed()
        .setDescription(`# Invalid Transactions Per Second Input
\n\`${txPerSecondInput}\` is not a valid input. Please input a positive integer that is less than 15.`);
    interaction.update({
        embeds: [invalidTxPerSecondInput],
        components: [{
            type: 1,
            components: [createTaskButton, manageTasksButton, sellKeysButton, settingsButton]
        }],
        ephemeral: true
    });
}

async function updateInvalidDepositAmountEmbed(interaction, ethAmountInput) {
    let invalidDepositEmbed = createDefaultEmbed()
        .setDescription(`# Invalid Deposit Amount
    \n\`${ethAmountInput}\` is not a valid amount of ETH to deposit. Please try again.`);
    interaction.update({
        embeds: [invalidDepositEmbed],
        components: [{
            type: 1,
            components: [depositButton, settingsButton]
        }],
        ephemeral: true
    });
}

async function updateInvalidStartDelayInputEmbed(interaction, startDelayInput) { // Updates the embed to say that startDelayInput is invalid.
    let invalidStartDelayInput = createDefaultEmbed()
        .setDescription(`# Invalid Start Delay Input
\n\`${startDelayInput}\` is not a valid input. Please input a positive integer.`);
    interaction.update({
        embeds: [invalidStartDelayInput],
        components: [{
            type: 1,
            components: [createTaskButton, manageTasksButton, sellKeysButton, settingsButton]
        }],
        ephemeral: true
    });
}

async function updateInvalidDurationInputEmbed(interaction, durationInput) { // Updates the embed to say that startDelayInput is invalid.
    let invalidDurationInput = createDefaultEmbed()
        .setDescription(`# Invalid Duration Input
\n\`${durationInput}\` is not a valid input. Please input a positive integer that is less than 120.`);
    interaction.update({
        embeds: [invalidDurationInput],
        components: [{
            type: 1,
            components: [createTaskButton, manageTasksButton, sellKeysButton, settingsButton]
        }],
        ephemeral: true
    });
}

async function updateNotEnoughEthEmbed(interaction, walletBalance, depositAmount, walletAddress) { // Updates the embed to say that the user doesnt have enough eth to deposit their inputted amount.
    let notEnoughEthEmbed = createDefaultEmbed()
        .setDescription(`# Not enough ETH!
\nYou cannot deposit **${depositAmount}** ETH as you only have __**${walletBalance}**__ ETH in your [wallet](https://basescan.org/address/${walletAddress}).`);
    interaction.update({
        embeds: [notEnoughEthEmbed],
        components: [{
            type: 1,
            components: [depositButton, homeButton]
        }],
        ephemeral: true
    });
}

// EMBEDS FOR NO TASKS
async function updateNoSnipeTasksEmbed(interaction) { // Updates embed to say you have no snipe tasks.
    let noSnipeTasksEmbed = createDefaultEmbed()
        .setDescription(`# You have no snipe tasks!
        \nPlease select another option.`);
    interaction.update({
        embeds: [noSnipeTasksEmbed],
        components: [{
            type: 1,
            components: [createTaskButton, manageTasksButton, sellKeysButton, settingsButton]
        }],
        ephemeral: true
    });
}

async function updateNoSpamTasksEmbed(interaction) { // Updates embed to say you have no spam tasks.
    let noSpamTasksEmbed = createDefaultEmbed()
        .setDescription(`# You have no spam tasks!
        \nPlease select another option.`);
    interaction.update({
        embeds: [noSpamTasksEmbed],
        components: [{
            type: 1,
            components: [createTaskButton, manageTasksButton, sellKeysButton, settingsButton]
        }],
        ephemeral: true
    });
}

async function updateNoSnipeTasksEmbed(interaction) { // Updates embed to say you have no snipe tasks.
    let noSnipeTasksEmbed = createDefaultEmbed()
        .setDescription(`# You have no snipe tasks!
        \nPlease select another option.`);
    interaction.update({
        embeds: [noSnipeTasksEmbed],
        components: [{
            type: 1,
            components: [createTaskButton, manageTasksButton, sellKeysButton, settingsButton]
        }],
        ephemeral: true
    });
}

async function updateErrorEmbed(interaction) {
    let errorEmbed = createDefaultEmbed()
        .setDescription(`# Error
    \nThere was an issue performing this operation. Please contact <@488095760160915481> with details about this issue.`);
    interaction.update({
        embeds: [errorEmbed],
        components: [{
            type: 1,
            components: [createTaskButton, manageTasksButton, sellKeysButton, settingsButton]
        }],
        ephemeral: true
    });
}

async function updateNoSpamSettingsEmbed(interaction) { // Updates the embed asking the user to input their settings.
    let noSpamSettingsEmbed = createDefaultEmbed()
        .setDescription(`# Choose your Spam Settings
    \nYou need to set your spam settings before you can make a Spam Task. Spam Tasks wait for a wallet that you think belongs to someone important to fund a fresh wallet on base and then spam buy transactions in hopes of buying in the same block that their keys go live.
    \n- **Transactions Per Second**: The amount of transactions that will be sent per second (Max = 15).
    \n- **Start Delay**: The start delay is the amount of time after a wallet receives funding before the bot starts to spam transactions.
    \n- **Duration**: The duration is the length of time that the bot will spam transactions for.
    \nIt is also important to note that if the bot detects that the keys have gone live, it will stop spamming.`);
    interaction.update({
        embeds: [noSpamSettingsEmbed],
        components: [{
            type: 1,
            components: [inputSpamSettingsButton, homeButton]
        }],
        ephemeral: true
    });
}

async function updateNoSpamTaskFoundEmbed(interaction, twitterHandleInput) { // Updates the embed to say that it couldnt find the spam task
    let noSpamTaskFoundEmbed = createDefaultEmbed()
        .setDescription(`# Spam Task Not Found
\n\`We couldn't find a spam task for [@${twitterHandleInput}](https://twitter.com/${twitterHandleInput}). Please try again.`);
    interaction.update({
        embeds: [noSpamTaskFoundEmbed],
        components: [{
            type: 1,
            components: [createTaskButton, manageTasksButton, sellKeysButton, settingsButton]
        }],
        ephemeral: true
    });
}

async function updateNoSnipeTaskFoundEmbed(interaction, twitterHandleInput) { // Updates the embed to say that it couldnt find the snipe task
    let noSnipeTaskFoundEmbed = createDefaultEmbed()
        .setDescription(`# Snipe Task Not Found
\n\`We couldn't find a Snipe Task for [@${twitterHandleInput}](https://twitter.com/${twitterHandleInput}). Please try again.`);
    interaction.update({
        embeds: [noSnipeTaskFoundEmbed],
        components: [{
            type: 1,
            components: [createTaskButton, manageTasksButton, sellKeysButton, settingsButton]
        }],
        ephemeral: true
    });
}

async function updateNoWalletFoundEmbed(interaction, twitterHandleInput, sweepPriceInput) { // Updates an embed to say no wallet was found for the inputted user.
    let noSnipeTaskFoundEmbed = createDefaultEmbed()
        .setDescription(`# Wallet Not Found
\nWe were unable to find the Friend.Tech wallet address for **[@${twitterHandleInput}](https://twitter.com/${twitterHandleInput})**. If you are confident you have it, please input it with the button below to spam buy them up to **${sweepPriceInput}** ETH.`);
    interaction.update({
        embeds: [noSnipeTaskFoundEmbed],
        components: [{
            type: 1,
            components: [inputSpamWalletButton, homeButton]
        }],
        ephemeral: true
    });
}

// EMBEDS FOR MANAGING TASKS
const PAGE_SIZE = 20;
async function updateManageSpamTasksEmbed(interaction, spamTasks, page) {
    let description = `# Please select which spam task you want to edit\n**`; // Setting the big text and then the new line and starting bold text
    let startIndex = (page - 1) * PAGE_SIZE;
    let endIndex = Math.min(spamTasks.length, page * PAGE_SIZE); // Making sure the looping ends at the end of a page or last wallet of first page.
    let selectSpamTaskMenu = new StringSelectMenuBuilder() // Create a select menu with all wallets.
        .setCustomId('selectSpamTaskMenu')
        .setPlaceholder('Which spam task do you want to edit?');
    for (let spamTaskNumber = startIndex; spamTaskNumber < endIndex; spamTaskNumber++) { // Looping through the spam tasks starting at the first of the page and stopping at the amount
        let twitterHandle = spamTasks[spamTaskNumber].twitter_handle;
        let sweepPrice = spamTasks[spamTaskNumber].sweepPrice;
        selectSpamTaskMenu.addOptions({
            label: `${twitterHandle} - ${sweepPrice}`,
            value: `${twitterHandle}-${sweepPrice}`,
        });
        if (spamTaskNumber != startIndex) description += `\n`; // If the spam task being added isn't the first, add a new line
        description += `[@${twitterHandle}](https://twitter.com/${twitterHandle}) (${sweepPrice} ETH)`; // Adding the task on a new line
    }
    description += `**`; // Adding the end of the bold text to the description.
    let maxPages = Math.floor((spamTasks.length - 1) / PAGE_SIZE) + 1; // Setting the max amount of pages.
    let manageSpamTasksEmbed = createDefaultEmbed()
        .setDescription(description); // Setting the description to what was created above.
    let pageButtonRow = getPageButtonsRow(page, maxPages, `SpamTasks`);
    let secondActionRow = new ActionRowBuilder().addComponents(selectSpamTaskMenu); // Creating the action row.
    await interaction.update({
        embeds: [manageSpamTasksEmbed],
        components: [pageButtonRow, secondActionRow]
    });
}

async function updateEditSpamTaskEmbed(interaction, twitterHandleInput, sweepPriceInput) {
    let editSpamTaskEmbed = createDefaultEmbed()
        .setDescription(`# Edit Spam Task
    \nHow would you like to edit your task for spam buying **[@${twitterHandleInput}](https://twitter.com/${twitterHandleInput})** up to **${sweepPriceInput}** ETH?`);
    await interaction.update({
        embeds: [editSpamTaskEmbed],
        components: [{
            type: 1,
            components: [changeSpamTaskSweepPriceButton, deleteSpamTaskButton, homeButton]
        }],
    });
}

async function updateSpamTaskWalletChangedEmbed(interaction, twitterHandleInput, walletAddressInput) {
    let spamTaskChangedEmbed = createDefaultEmbed()
        .setDescription(`# Spam Task Updated
    \nYou have changed the Wallet Address for spamming **[@${twitterHandleInput}](https://twitter.com/${twitterHandleInput})** to **[${walletAddressInput}](https://etherscan.io/address/${walletAddressInput})**.`)
    await interaction.update({
        embeds: [spamTaskChangedEmbed],
        components: [{
            type: 1,
            components: [deleteSpamTaskButton, homeButton]
        }],
    });
}

async function updateSpamTaskSweepPriceChangedEmbed(interaction, twitterHandleInput, sweepPriceInput, oldSweepPrice) {
    let spamTaskSweepPriceChangedEmbed = createDefaultEmbed()
        .setDescription(`# Spam Task Updated
    \nYou have changed the Sweep Price for spamming **[@${twitterHandleInput}](https://twitter.com/${twitterHandleInput})** from **${oldSweepPrice}** to **${sweepPriceInput}**.`);
    await interaction.update({
        embeds: [spamTaskSweepPriceChangedEmbed],
        components: [{
            type: 1,
            components: [changeSpamTaskSweepPriceButton, deleteSpamTaskButton, homeButton]
        }],
    });
}

async function updateSpamTaskRemovedEmbed(interaction, twitterHandleInput) {
    let spamTaskRemovedEmbed = createDefaultEmbed()
        .setDescription(`# Spam Task Removed
\nYou have changed the Spam Task for **[@${twitterHandleInput}](https://twitter.com/${twitterHandleInput})**.`)
    await interaction.update({
        embeds: [spamTaskRemovedEmbed],
        components: [{
            type: 1,
            components: [createTaskButton, manageTasksButton, sellKeysButton, settingsButton]
        }],
    });
}

async function updateManageSnipeTasksEmbed(interaction, snipeTasks, page) {
    let description = `# Please select which snipe task you want to edit\n**`; // Setting the big text and then the new line and starting bold text
    let startIndex = (page - 1) * PAGE_SIZE;
    let endIndex = Math.min(snipeTasks.length, page * PAGE_SIZE); // Making sure the looping ends at the end of a page or last wallet of first page.
    let selectSnipeTaskMenu = new StringSelectMenuBuilder() // Create a select menu with all snipe tasks.
        .setCustomId('selectSnipeTaskMenu')
        .setPlaceholder('Which snipe task do you want to edit?');
    for (let snipeTaskNumber = startIndex; snipeTaskNumber < endIndex; snipeTaskNumber++) { // Looping through the spam tasks starting at the first of the page and stopping at the amount
        let twitterHandle = snipeTasks[snipeTaskNumber].twitter_handle;
        let sweepPrice = snipeTasks[snipeTaskNumber].sweepPrice;
        let prio = snipeTasks[snipeTaskNumber].prio;
        selectSnipeTaskMenu.addOptions({
            label: `${twitterHandle} - Sweep to ${sweepPrice} ETH`,
            value: `${twitterHandle}-${sweepPrice}-${prio}`,
        });
        if (snipeTaskNumber != startIndex) description += `\n`; // If the spam task being added isn't the first, add a new line
        description += `[@${twitterHandle}](https://twitter.com/${twitterHandle}) up to \`${sweepPrice}\` ETH at \`${prio}\` gwei.`; // Adding the task on a new line
    }
    description += `**`; // Adding the end of the bold text to the description.
    let maxPages = Math.floor((snipeTasks.length - 1) / PAGE_SIZE) + 1; // Setting the max amount of pages.
    let manageSnipeTasksEmbed = createDefaultEmbed()
        .setDescription(description); // Setting the description to what was created above.
    let pageButtonRow = getPageButtonsRow(page, maxPages, `SnipeTasks`);
    let secondActionRow = new ActionRowBuilder().addComponents(selectSnipeTaskMenu); // Creating the action row.
    await interaction.update({
        embeds: [manageSnipeTasksEmbed],
        components: [pageButtonRow, secondActionRow]
    });
}

async function updateEditSnipeTaskEmbed(interaction, twitterHandleInput, sweepPriceInput, prioInput) {
    let editSnipeTaskEmbed = createDefaultEmbed()
        .setDescription(`# Edit Snipe Task
    \nHow would you like to edit your task for **[@${twitterHandleInput}](https://twitter.com/${twitterHandleInput})**?
    You are currently set up to sweep up to **${sweepPriceInput} ETH** at **${prioInput} Gwei**.`);
    await interaction.update({
        embeds: [editSnipeTaskEmbed],
        components: [{
            type: 1,
            components: [changeSnipeTaskSweepPriceButton, changeSnipeTaskPrioButton, deleteSnipeTaskButton, homeButton]
        }],
    });
}

async function updateSnipeTaskSweepPriceChangedEmbed(interaction, twitterHandleInput, sweepPriceInput, oldSweepPrice) {
    let snipeTaskSweepPriceChangedEmbed = createDefaultEmbed()
        .setDescription(`# Snipe Task Updated
    \nYou have changed the Sweep Price for sniping **[@${twitterHandleInput}](https://twitter.com/${twitterHandleInput})** from **${oldSweepPrice}** ETH to **${sweepPriceInput}** ETH.`);
    await interaction.update({
        embeds: [snipeTaskSweepPriceChangedEmbed],
        components: [{
            type: 1,
            components: [changeSnipeTaskSweepPriceButton, changeSnipeTaskPrioButton, deleteSnipeTaskButton, homeButton]
        }],
    });
}

async function updateSnipeTaskPrioChangedEmbed(interaction, twitterHandleInput, prioInput, oldPrio) {
    let snipeTaskPrioChangedEmbed = createDefaultEmbed()
        .setDescription(`# Snipe Task Updated
    \nYou have changed the Prio for sniping **[@${twitterHandleInput}](https://twitter.com/${twitterHandleInput})** from **${oldPrio}** Gwei to **${prioInput}** Gwei.`);
    await interaction.update({
        embeds: [snipeTaskPrioChangedEmbed],
        components: [{
            type: 1,
            components: [changeSnipeTaskSweepPriceButton, changeSnipeTaskPrioButton, deleteSnipeTaskButton, homeButton]
        }],
    });
}

async function updateSnipeTaskRemovedEmbed(interaction, twitterHandleInput) {
    let snipeTaskRemovedEmbed = createDefaultEmbed()
        .setDescription(`# Snipe Task Removed
\nYou have removed the Snipe Task for **[@${twitterHandleInput}](https://twitter.com/${twitterHandleInput})**.`)
    await interaction.update({
        embeds: [snipeTaskRemovedEmbed],
        components: [{
            type: 1,
            components: [createTaskButton, manageTasksButton, sellKeysButton, settingsButton]
        }],
    });
}

// EMBED FOR SELLING FROM CONTRACT:
async function updateContractSellingEmbed(interaction, keysHeld, page) {
    let walletAddress = await getWalletAddress(interaction.user.id, `discord`);
    let balanceCheckerResponse = await balanceCheckerContract.getSellPricesForSubjects(keysHeld.map(key => key.address), walletAddress); // Getting key prices.
    for (let balanceNumber = 0; balanceNumber < balanceCheckerResponse[0].length; balanceNumber++) {
        keysHeld[balanceNumber].keyPrice = ethers.utils.formatUnits(balanceCheckerResponse[0][balanceNumber][0], `ether`); // Adding keyPrice to the keysHeld array.
    }
    let description = `# Please select which keys you want to sell\n**`; // Setting the big text and then the new line and starting bold text
    let startIndex = (page - 1) * PAGE_SIZE;
    let endIndex = Math.min(keysHeld.length, page * PAGE_SIZE); // Making sure the looping ends at the end of a page or last holding of first page.
    let selectContractSellingMenu = new StringSelectMenuBuilder() // Create a select menu with all contract keysHeld.
        .setCustomId('selectContractSellingMenu')
        .setPlaceholder('Which key do you want to sell?');
    for (let keyNumber = startIndex; keyNumber < endIndex; keyNumber++) { // Looping through the spam tasks starting at the first of the page and stopping at the amount
        let keyAddress = keysHeld[keyNumber].address.toLowerCase();
        let keyTwitterHandle = keysHeld[keyNumber].twitterUsername;
        let keyTwitterName = keysHeld[keyNumber].twitterName;
        let keyBalance = keysHeld[keyNumber].balance;
        let keyPrice = keysHeld[keyNumber].keyPrice;
        let keys_S = ``;
        if (keyBalance > 1) keys_S = `s`;
        selectContractSellingMenu.addOptions({
            label: `${keyTwitterHandle}-🔑${keyBalance}@${parseFloat(keyPrice).toFixed(3)}`,
            value: `${keyTwitterHandle}-${keyAddress}-${keyBalance}`,
        });
        if (keyNumber != startIndex) description += `\n`; // If the key held being added isn't the first, add a new line
        description += `[${keyTwitterName}](https://twitter.com/${keyTwitterHandle}) - 🔑 ${keyBalance} @ ${parseFloat(keyPrice).toPrecision(3)}`; // Adding the task on a new line
    }
    description += `**`; // Adding the end of the bold text to the description.
    let maxPages = Math.floor((keysHeld.length - 1) / PAGE_SIZE) + 1; // Setting the max amount of pages.
    let manageContractSellingEmbed = createDefaultEmbed()
        .setDescription(description); // Setting the description to what was created above.
    let pageButtonRow = getPageButtonsRow(page, maxPages, `ContractSelling`);
    let secondActionRow = new ActionRowBuilder().addComponents(selectContractSellingMenu); // Creating the action row.
    await interaction.update({
        embeds: [manageContractSellingEmbed],
        components: [pageButtonRow, secondActionRow]
    });
}

async function updateContractSellKeyEmbed(interaction, twitterHandleInput, keyAddressInput, walletAddress, keyBalance) {
    let sellPrices = await balanceCheckerContract.getSellPricesForSubjects([keyAddressInput], walletAddress);
    let keyAmountField = ``;
    let sellPriceTax = ``;
    let sellPriceNoTax = ``;
    for (let keyNumber = 0; keyNumber < Math.min(keyBalance, 4); keyNumber++) { // Iterating through the first 4 keys.
        if (keyNumber != 0) { // Adding a new line at the start of each field if it isn't the first line.
            keyAmountField += `\n`;
            sellPriceTax += `\n`;
            sellPriceNoTax += `\n`;
        }
        // Adding the rows for keys and sell prices.
        keyAmountField += `${keyNumber + 1}`;
        sellPriceTax += `${parseFloat(ethers.utils.formatUnits(sellPrices.pricesWithoutFees[0][keyNumber], `ether`)).toPrecision(3)}`;
        sellPriceNoTax += `${parseFloat(ethers.utils.formatUnits(sellPrices.pricesWithFees[0][keyNumber], `ether`)).toPrecision(3)}`;
    }
    if (keyBalance > 4) { // If the keyBalance is more than 5, add the row for selling all keys.
        keyAmountField += `\n${keyBalance}`;
        sellPriceTax += `\n${parseFloat(ethers.utils.formatUnits(sellPrices.pricesWithoutFees[0][5], `ether`)).toPrecision(3)}`;
        sellPriceNoTax += `\n${parseFloat(ethers.utils.formatUnits(sellPrices.pricesWithFees[0][5], `ether`)).toPrecision(3)}`;
    }

    let contractSellKeyEmbed = createDefaultEmbed()
        .setDescription(`# How many keys do you want to sell?\nYou currently have **${keyBalance}** of **[@${twitterHandleInput}](https://twitter.com/${twitterHandleInput})**'s Keys.`)
        .addFields({ name: `**Key Amount**`, value: keyAmountField, inline: true })
        .addFields({ name: `**Sell Price**`, value: sellPriceTax, inline: true })
        .addFields({ name: `**Sell Price (After Tax)**`, value: sellPriceNoTax, inline: true })
        .addFields(getLinksField(keyAddressInput, twitterHandleInput));
    interaction.update({
        embeds: [contractSellKeyEmbed],
        components: [getSellButtonsRow(keyAddressInput, keyBalance, `ContractSell`)],
        ephemeral: true
    });
}

async function updateNoKeysHeldContractEmbed(interaction) {
    let noKeysHeldContractEmbed = createDefaultEmbed()
        .setDescription(`# Your contract has no keys!
    \nPlease select another option.`);
    interaction.update({
        embeds: [noKeysHeldContractEmbed],
        components: [{
            type: 1,
            components: [createTaskButton, manageTasksButton, sellKeysButton, settingsButton]
        }],
        ephemeral: true
    });
}

// EMBEDS FOR SELLING FROM WALLET
async function updateWalletSellingEmbed(interaction, keysHeld, page) {
    let walletAddress = await getWalletAddress(interaction.user.id, `discord`);
    let balanceCheckerResponse = await balanceCheckerContract.getSellPricesForSubjects(keysHeld.map(key => key.address), walletAddress); // Getting key prices.
    for (let balanceNumber = 0; balanceNumber < balanceCheckerResponse[0].length; balanceNumber++) {
        keysHeld[balanceNumber].keyPrice = ethers.utils.formatUnits(balanceCheckerResponse[0][balanceNumber][0], `ether`); // Adding keyPrice to the keysHeld array.
    }
    let description = `# Please select which keys you want to sell\n**`; // Setting the big text and then the new line and starting bold text
    let startIndex = (page - 1) * PAGE_SIZE;
    let endIndex = Math.min(keysHeld.length, page * PAGE_SIZE); // Making sure the looping ends at the end of a page or last holding of first page.
    let selectWalletSellingMenu = new StringSelectMenuBuilder() // Create a select menu with all contract keysHeld.
        .setCustomId('selectWalletSellingMenu')
        .setPlaceholder('Which key do you want to sell?');
    for (let keyNumber = startIndex; keyNumber < endIndex; keyNumber++) { // Looping through the spam tasks starting at the first of the page and stopping at the amount
        let keyAddress = keysHeld[keyNumber].address.toLowerCase();
        let keyTwitterHandle = keysHeld[keyNumber].twitterUsername;
        let keyTwitterName = keysHeld[keyNumber].twitterName;
        let keyBalance = keysHeld[keyNumber].balance;
        let keyPrice = keysHeld[keyNumber].keyPrice;
        selectWalletSellingMenu.addOptions({
            label: `${keyTwitterHandle}-🔑${keyBalance}@${parseFloat(keyPrice).toFixed(3)}`,
            value: `${keyTwitterHandle}-${keyAddress}-${keyBalance}`,
        });
        if (keyNumber != startIndex) description += `\n`; // If the key held being added isn't the first, add a new line
        description += `[${keyTwitterName}](https://twitter.com/${keyTwitterHandle}) - 🔑 ${keyBalance} @ ${parseFloat(keyPrice).toPrecision(3)}`; // Adding the task on a new line
    }
    description += `**`; // Adding the end of the bold text to the description.
    let maxPages = Math.floor((keysHeld.length - 1) / PAGE_SIZE) + 1; // Setting the max amount of pages.
    let manageContractSellingEmbed = createDefaultEmbed()
        .setDescription(description); // Setting the description to what was created above.
    let pageButtonRow = getPageButtonsRow(page, maxPages, `WalletSelling`);
    let secondActionRow = new ActionRowBuilder().addComponents(selectWalletSellingMenu); // Creating the action row.
    await interaction.update({
        embeds: [manageContractSellingEmbed],
        components: [pageButtonRow, secondActionRow]
    });
}

async function updateWalletSellKeyEmbed(interaction, twitterHandleInput, keyAddressInput, walletAddress, keyBalance) {
    console.log(`keyAddressInput: ${keyAddressInput}, walletAddress: ${walletAddress}`)
    let sellPrices = await balanceCheckerContract.getSellPricesForSubjects([keyAddressInput], walletAddress);
    let keyAmountField = ``;
    let sellPriceTax = ``;
    let sellPriceNoTax = ``;
    for (let keyNumber = 0; keyNumber < Math.min(keyBalance, 4); keyNumber++) { // Iterating through the first 4 keys.
        if (keyNumber != 0) { // Adding a new line at the start of each field if it isn't the first line.
            keyAmountField += `\n`;
            sellPriceTax += `\n`;
            sellPriceNoTax += `\n`;
        }
        // Adding the rows for keys and sell prices.
        keyAmountField += `${keyNumber + 1}`;
        sellPriceTax += `${parseFloat(ethers.utils.formatUnits(sellPrices.pricesWithoutFees[0][keyNumber], `ether`)).toPrecision(3)}`;
        sellPriceNoTax += `${parseFloat(ethers.utils.formatUnits(sellPrices.pricesWithFees[0][keyNumber], `ether`)).toPrecision(3)}`;
    }
    if (keyBalance > 4) { // If the keyBalance is more than 5, add the row for selling all keys.
        keyAmountField += `\n${keyBalance}`;
        sellPriceTax += `\n${parseFloat(ethers.utils.formatUnits(sellPrices.pricesWithoutFees[0][5], `ether`)).toPrecision(3)}`;
        sellPriceNoTax += `\n${parseFloat(ethers.utils.formatUnits(sellPrices.pricesWithFees[0][5], `ether`)).toPrecision(3)}`;
    }
    let walletSellKeyEmbed = createDefaultEmbed()
        .setDescription(`# How many keys do you want to sell?\nYou currently have **${keyBalance}** of **[@${twitterHandleInput}](https://twitter.com/${twitterHandleInput})**'s keys.`)
        .addFields({ name: `**Key Amount**`, value: keyAmountField, inline: true })
        .addFields({ name: `**Sell Price**`, value: sellPriceTax, inline: true })
        .addFields({ name: `**Sell Price (After Tax)**`, value: sellPriceNoTax, inline: true })
        .addFields(getLinksField(keyAddressInput, twitterHandleInput));
    interaction.update({
        embeds: [walletSellKeyEmbed],
        components: [getSellButtonsRow(keyAddressInput, keyBalance, `WalletSell`)],
        ephemeral: true
    });
}

async function updateNoKeysHeldWalletEmbed(interaction) {
    let noKeysHeldWalletEmbed = createDefaultEmbed()
        .setDescription(`# Your wallet has no keys!
    \nPlease select another option.`);
    interaction.update({
        embeds: [noKeysHeldWalletEmbed],
        components: [{
            type: 1,
            components: [createTaskButton, manageTasksButton, sellKeysButton, settingsButton]
        }],
        ephemeral: true
    });
}

// EMBEDS FOR DISCORD MONITORS
// Channel IDS FOR FIRST BUY TRANSACTIONS
const FIRST_BUY_10 = `1145067646954512445`;
const FIRST_BUY_2500 = `1152373898659246091`;
const FIRST_BUY_25000 = `1152373972323803178`;
const FIRST_BUY_100000 = `1152374061700218940`;

// CHANNEL IDS FOR SELF BUY TRANSACTIONS:
const SELF_BUY_0 = `1152630816455794738`;
const SELF_BUY_25 = `1152493032927678464`;
const SELF_BUY_5 = `1152629557128601720`;
const SELF_BUY_10 = `1152630749221109760`;

// Getting the links field for all embeds
function getLinksField(walletAddress, twitterHandle) { // Getting the links field for the discord embeds.
    let links = `**<:friendsTech:1144396944756723807> [friend.tech](https://www.friend.tech/rooms/${walletAddress}) · <:basescan:1144396907519680574> [Basescan](https://basescan.org/address/${walletAddress}) · <:twitter:1079557924382326835> [Twitter](https://twitter.com/${twitterHandle}) · <:nftthunder:1082479941498716210> [NFTThunder QT](http://localhost:7777/quickTask?module=friendtech&target=${walletAddress})**`;
    let linksField = { name: `**Links**`, value: links, inline: false };
    return linksField
}

function getKeyFields(keyCount, keyHolders, keyPrice) { // Getting the fields for the key information.
    let holderCountField = { name: `**Holder Count**`, value: `${keyHolders}`, inline: true };
    let keySupplyField = { name: `**Key Supply**`, value: `${keyCount}`, inline: true };
    let keyPriceField = { name: `**Key Price**`, value: `${parseFloat(keyPrice).toPrecision(3)}`, inline: true };
    return [holderCountField, keySupplyField, keyPriceField];
}

// Embed when someone makes their first buy.
async function sendFirstBuyEmbed(discordClient, baseBalances, walletAddress, transactionHash, kosettoInfo, twitterInfo, kosettoHolderInfo) { // Sends the self buy embed to the desired channel.
    let firstBuyEmbed = createDefaultEmbed()
        .setThumbnail(twitterInfo.PFPURL)
        .setTitle(`First Buy Alert`)
        .setURL(`https://basescan.org/tx/${transactionHash}`)
        .setDescription(`# ${kosettoInfo.twitterDisplayName} ([@${kosettoInfo.twitterHandle}](https://twitter.com/${kosettoInfo.twitterHandle}))\n${twitterInfo.bio}\n\`\`\`${walletAddress}\`\`\`\`\`\`${kosettoInfo.twitterHandle}\`\`\``)
        .addFields({ name: `**Followers**`, value: `${twitterInfo.followerCount}`, inline: true })
        .addFields({ name: `**Tweets / Likes**`, value: `${twitterInfo.tweetCount} **/** ${twitterInfo.likeCount}`, inline: true })
        .addFields({ name: `**Base Balance**`, value: `${baseBalances[0]}`, inline: true }) // Adding base balance field.
        .addFields(getKeyFields(kosettoInfo.keyCount, kosettoInfo.keyHolders, kosettoInfo.keyPrice)) // Adding the key fields
        .addFields(getHoldersFields(kosettoHolderInfo, baseBalances))
        .addFields(getLinksField(walletAddress, kosettoInfo.twitterHandle)); // Adding the links field
    let CHANNEL_ID = SELF_BUY_0; // Setting the channel to send the embed to as the no requirement channel.
    switch (true) { // Sending embeds to channels based on follower count.
        case twitterInfo.followerCount >= 100000:
            CHANNEL_ID = FIRST_BUY_100000;
            break;
        case twitterInfo.followerCount >= 25000:
            CHANNEL_ID = FIRST_BUY_25000;
            break;
        case twitterInfo.followerCount >= 2500:
            CHANNEL_ID = FIRST_BUY_2500;
            break;
        case twitterInfo.followerCount >= 10:
            CHANNEL_ID = FIRST_BUY_10;
            break;
        default:
            console.log(`No firstBuy embed sent for ${kosettoInfo.twitterHandle} as it had less than 10 followers.`);
            return;
    }
    const channel = discordClient.channels.cache.get(CHANNEL_ID); // Getting the channel to send the embed to
    channel.send({ embeds: [firstBuyEmbed], components: [getBuyButtonsRow(walletAddress, `WalletBuy`)] }); // Sending the embed
}

function getHoldersFields(kosettoHolderInfo, baseBalances) {
    let holderString = ``;
    let keyString = ``;
    let balanceString = ``;
    for (let holderNumber = 0; holderNumber < Math.min(kosettoHolderInfo.length, 5); holderNumber++) {
        let nameContinues = ``;
        if (kosettoHolderInfo[holderNumber].twitterName.length > 16) nameContinues = `...`;
        holderString += `[${kosettoHolderInfo[holderNumber].twitterName.substring(0, 16) + nameContinues}](https://twitter.com/${kosettoHolderInfo[holderNumber].twitterUsername})\n`;
        keyString += `${kosettoHolderInfo[holderNumber].balance}\n`;
        balanceString += `${baseBalances[holderNumber + 1]}\n`;
    }
    if (kosettoHolderInfo.length == 0) return [{ name: `**Top Holders**`, value: 'N/A', inline: true }, { name: `**Keys Held**`, value: 'N/A', inline: true }, { name: `**Balance**`, value: 'N/A', inline: true }];
    return [{ name: `**Top Holders**`, value: holderString, inline: true }, { name: `**Keys Held**`, value: keyString, inline: true }, { name: `**Balance**`, value: balanceString, inline: true }];
}

async function sendSelfBuyEmbed(discordClient, baseBalances, walletAddress, transactionHash, shareAmount, kosettoInfo, twitterInfo, kosettoHolderInfo) { // Sends the self buy embed to the desired channel.
    let selfBuyEmbed = createDefaultEmbed()
        .setThumbnail(twitterInfo.PFPURL)
        .setTitle(`Self Buy Alert`)
        .setURL(`https://basescan.org/tx/${transactionHash}`)
        .setDescription(`# ${kosettoInfo.twitterDisplayName} ([@${kosettoInfo.twitterHandle}](https://twitter.com/${kosettoInfo.twitterHandle}))\n${twitterInfo.bio}\n\`\`\`${walletAddress}\`\`\`\`\`\`${kosettoInfo.twitterHandle}\`\`\``)
        .addFields({ name: `**Followers**`, value: `${twitterInfo.followerCount}`, inline: true })
        .addFields({ name: `**Tweets / Likes**`, value: `${twitterInfo.tweetCount} / ${twitterInfo.likeCount}`, inline: true })
        .addFields({ name: `**Base Balance**`, value: `${baseBalances[0]}`, inline: true }) // Adding base balance field.
        .addFields(getKeyFields(kosettoInfo.keyCount, kosettoInfo.keyHolders, kosettoInfo.keyPrice)) // Adding the key fields
        .addFields({ name: `**Keys Purchased**`, value: `${shareAmount}`, inline: true }) // Add keys purchased field
        .addFields({ name: '\u200B', value: '\u200B', inline: true }) // Adding empty field for spacing.
        .addFields({ name: '\u200B', value: '\u200B', inline: true }) // Adding empty field for spacing.
        .addFields(getHoldersFields(kosettoHolderInfo, baseBalances))
        .addFields(getLinksField(walletAddress, kosettoInfo.twitterHandle)); // Adding the links field

    let CHANNEL_ID = SELF_BUY_0; // Setting the channel to send the embed to as the no requirement channel.
    switch (true) { // Changing the channel the embed will send to depending on the wallet balance.
        case baseBalances[0] > 10:
            CHANNEL_ID = SELF_BUY_10;
            break;
        case baseBalances[0] > 5:
            CHANNEL_ID = SELF_BUY_5;
            break;
        case baseBalances[0] > 2.5:
            CHANNEL_ID = SELF_BUY_25;
            break;
    }
    const channel = discordClient.channels.cache.get(CHANNEL_ID); // Getting the channel to send the embed to
    channel.send({ embeds: [selfBuyEmbed], components: [getBuyButtonsRow(walletAddress, `WalletBuy`)] }); // Sending the embed
}

// SENDING EMBED FOR SALES
async function sendSalesEmbed(discordClient, traderAddress, keyAddress, shareAmount, ethAmount, transactionHash) {
    let buyerInfo = await getInfo(traderAddress);
    let keyOwner;
    let CHANNEL_ID;
    switch (keyAddress) {
        case `0x3d079438778d779e4fbbd36f9a573eb9364fd702`:
            keyOwner = `Billioonaire`;
            CHANNEL_ID = `1152808222235840643`;
            break;
        case `0x414c102fee272844a8afb817464942e101034e38`:
            keyOwner = `Shady_Oak1`;
            CHANNEL_ID = `1152808263532949504`;
            break;
    }
    let salesEmbed = createDefaultEmbed()
        .setDescription(`# ${shareAmount} key(s) purchased!
        \n**[${buyerInfo.twitterDisplayName} (@${buyerInfo.twitterHandle})](https://twitter.com/${buyerInfo.twitterHandle})** purchased **${shareAmount}** of **[@${keyOwner}](https://www.friend.tech/rooms/${keyAddress})'s** keys for ${ethAmount} ETH.`)
        .setThumbnail(buyerInfo.PFPURL)
        .addFields(getSalesLinksField(traderAddress, buyerInfo.twitterDisplayName, keyAddress, keyOwner, transactionHash));
    const channel = discordClient.channels.cache.get(CHANNEL_ID); // Getting the channel to send the embed to
    channel.send({ embeds: [salesEmbed] }); // Sending the embed
}

function getSalesLinksField(traderAddress, traderName, keyAddress, keyOwner, transactionHash) {
    return { name: `**Links**`, value: `**<:basescan:1144396907519680574> [Tx Link](https://basescan.org/tx/${transactionHash}) · <:friendsTech:1144396944756723807> [${traderName}](https://www.friend.tech/rooms/${traderAddress}) · <:friendsTech:1144396944756723807> [${keyOwner}](https://www.friend.tech/rooms/${keyAddress})**` }
}

// SENDING THE EMBED FOR NEW SIGNUPS
async function sendNewSignUpEmbed(discordClient, keyAddress, twitterHandle, displayName) {
    let twitterInfo = await getTwitterInfo(twitterHandle); // Getting the twitter info
    if (twitterInfo == null) return null; // Returning null if there is no twitter info.
    let newSignUpEmbed = createDefaultEmbed()
        .setThumbnail(twitterInfo.PFPURL)
        .setTitle(`New Account Signup`)
        .setURL(`https://basescan.org/address/${keyAddress}`)
        .setDescription(`# ${displayName} ([@${twitterHandle}](https://twitter.com/${twitterHandle}))\n${twitterInfo.bio}\n\`\`\`${twitterHandle}\`\`\`\`\`\`${keyAddress}\`\`\``)
        .addFields({ name: `**Followers**`, value: `${twitterInfo.followerCount}`, inline: true }) // Adding the twitter followers
        .addFields({ name: `**Tweets**`, value: `${twitterInfo.tweetCount}`, inline: true }) // Adding tweets field.
        .addFields({ name: `**Likes**`, value: `${twitterInfo.likeCount}`, inline: true }) // Adding likes field.
        .addFields(getLinksField(keyAddress, twitterHandle)); // Adding the links field
    let CHANNEL_ID;
    switch (true) {
        case twitterInfo.followerCount > 100000:
            CHANNEL_ID = `1153166868174086164`;
            break;
        case twitterInfo.followerCount > 25000:
            CHANNEL_ID = `1153166798439596092`;
            break;
        case twitterInfo.followerCount > 2500:
            CHANNEL_ID = `1153166672086188032`;
            break;
        case twitterInfo.followerCount > 10:
            CHANNEL_ID = `1153166579056521267`;
            break;
        default:
            console.log(`No new signup embed sent for ${twitterHandle} as it had less than 10 followers`);
            return;
    }
    if (twitterInfo.followers > 25000) {
        webhookClient.send({
            embeds: [newSignUpEmbed],
        }).then(() => {
            console.log('Embed sent to hideout successfully!');
        }).catch(error => {
            console.error('Error sending embed:', error);
        });
    }
    const channel = discordClient.channels.cache.get(CHANNEL_ID); // Getting the channel to send the embed to
    channel.send({ embeds: [newSignUpEmbed], components: [getQuickSpamButtonsRow(keyAddress, twitterHandle)] }); // Sending the embed
}

// EMBEDS FOR SELL TRANSACTIONS
async function updateSellTxSentEmbed(interaction, twitterHandleInput, keyAddress, sellAmount, transactionHash) { // Sends an embed for sent transactions.
    let sellTxSentEmbed = createDefaultEmbed()
        .setDescription(`# Sell transaction sent!
    \nThe [transaction](https://basescan.org/tx/${transactionHash}) has been sent to sell **${sellAmount}** of **[@${twitterHandleInput}](https://twitter.com/${twitterHandleInput})**'s keys.`)
        .addFields(getLinksField(keyAddress, twitterHandleInput))
        .setColor(`#ffe800`); // Setting the embed color to yellow.
    interaction.update({
        embeds: [sellTxSentEmbed],
        components: [{
            type: 1,
            components: [createTaskButton, manageTasksButton, sellKeysButton, settingsButton]
        }],
        ephemeral: true
    });
}

// SENDING EMBED FOR FAILED SNIPES
const FAILED_SNIPES_ID = `1152836166949802006`;
async function sendFailedSnipesEmbed(discordClient, blockNumber, filteredSnipedAddresses) {
    let embedDescription = `# Failed Snipes in Block [${blockNumber}](https://basescan.org/txs?block=${blockNumber})`;
    for (const failedSnipeAddress of filteredSnipedAddresses) {
        let twitterHandle = getTwitter(failedSnipeAddress.snipedAddress); // Getting the twitter of the keyAddress that was sniped.
        let twitterLinkString = ``;
        if (twitterHandle) {
            embedDescription += `\n**[@${twitterHandle}](https://twitter.com/${twitterHandle})** had **${failedSnipeAddress.totalSnipes}** failed snipes from **${Object.keys(failedSnipeAddress.sniperObjects).length}** snipers:\`\`\`${failedSnipeAddress.snipedAddress}\`\`\``;
            twitterLinkString = ` · <:twitter:1079557924382326835> [Twitter](https://twitter.com/${twitterHandle})`;
        } else {
            embedDescription += `\n**[${failedSnipeAddress.snipedAddress.substring(0, 6)}...${failedSnipeAddress.snipedAddress.slice(-4)}](https://basescan.org/address/${failedSnipeAddress.snipedAddress})** had **${failedSnipeAddress.totalSnipes}** from **${Object.keys(failedSnipeAddress.sniperObjects).length}** snipers:\`\`\`${failedSnipeAddress.snipedAddress}\`\`\``;
        }
        const sniperObjects = failedSnipeAddress.sniperObjects;
        let isFirstSniper = true; // Variable to track the first sniper address
        for (const sniperAddress in sniperObjects) {
            const failedSnipesCount = sniperObjects[sniperAddress];
            let extraS = ``;
            if (failedSnipesCount) extraS = `s`;
            if (isFirstSniper) {
                embedDescription += `[${sniperAddress.substring(0, 6)}...${sniperAddress.slice(-4)}](https://basescan.org/address/${sniperAddress}) - **${failedSnipesCount}** Fail${extraS}`;
                isFirstSniper = false; // Set it to false after the first iteration
            } else {
                embedDescription += `\n[${sniperAddress.substring(0, 6)}...${sniperAddress.slice(-4)}](https://basescan.org/address/${sniperAddress}) - **${failedSnipesCount}** Fail${extraS}`;
            }

        }
        embedDescription += `\n**<:friendsTech:1144396944756723807> [friend.tech](https://www.friend.tech/rooms/${failedSnipeAddress.snipedAddress}) · <:basescan:1144396907519680574> [Basescan](https://basescan.org/address/${failedSnipeAddress.snipedAddress})${twitterLinkString} · <:nftthunder:1082479941498716210> [NFTThunder QT](http://localhost:7777/quickTask?module=friendtech&target=${failedSnipeAddress.snipedAddress})**\n`
    }
    let failedSnipesEmbed = createDefaultEmbed()
        .setDescription(embedDescription);
    const channel = discordClient.channels.cache.get(FAILED_SNIPES_ID); // Getting the channel to send the embed to
    channel.send({ embeds: [failedSnipesEmbed] }); // Sending the embed
}

// UPDATING EMBEDS FOR SETTINGS
async function updateSettingsEmbed(interaction) { // Show the settings embed.
    let walletAddress = await getWalletAddress(interaction.user.id, `discord`); // Getting the users wallet address.
    let walletString = `\`Not Set\``;
    let buttonArray = [];
    let proxyContractAddress = await getProxyContract(interaction.user.id, `discord`); // getting the proxy contract from the settings.
    let proxyContractString = `\`Not Set\``;
    if (walletAddress) {
        walletString = `**[${walletAddress}](https://basescan.org/address/${walletAddress})**`;
        if (proxyContractAddress != ``) {
            proxyContractString = `**[${proxyContractAddress}](https://basescan.org/address/${proxyContractAddress})**`;
            buttonArray = [setSpamSettingsButton, homeButton, deleteMyDataButton];
        } else {
            buttonArray = [deployProxyContractButton, setSpamSettingsButton, homeButton, deleteMyDataButton];
        }
    } else {
        buttonArray = [inputPrivateKeyButton, deployProxyContractButton, setSpamSettingsButton, homeButton]
    }

    let spamSettings = await getSpamSettings(interaction.user.id, `discord`); // Getting the users spam settings.
    let txPerSecondString = `\`Not Set\``;
    let startDelayString = `\`Not Set\``;
    let durationString = `\`Not Set\``;

    if (spamSettings.txPerSecond) { // If the user has spam settings.
        txPerSecondString = `**${spamSettings.txPerSecond}**`;
        startDelayString = `**${spamSettings.startDelay}**`;
        durationString = `**${spamSettings.duration}**`;
    }
    let description =
        `- Wallet Address: ${walletString}\n- Your Proxy Contract: ${proxyContractString}

        **Spam Settings**
        - Transactions Per Second: ${txPerSecondString}\n- Start Delay after Funding: ${startDelayString}\n- Spam Duration: ${durationString}`;
    let settingsEmbed = createDefaultEmbed()
        .setTitle(`Settings`)
        .setDescription(description);
    interaction.update({
        embeds: [settingsEmbed],
        components: [{
            type: 1,
            components: [...buttonArray]
        }],
        ephemeral: true
    });
}

async function updateConfirmPrivateKeyEmbed(interaction) { // Sending an embed to confirm they know what their private key does.
    let confirmPrivateKeyEmbed = createDefaultEmbed()
        .setDescription(`# READ THIS CAREFULLY!
    Your private key is what gives us access to your wallet. For this reason, we **strongly recommend** that you input a burner wallet.
    
    While we are not storing your private keys on our server in raw text. It is important to know that they still need to be accessed in order to send transactions from your wallet. Regardless of who manages your private key, it is bad practice to put your main wallet into bots.
    
    We will **NEVER** ask you to input your private key again. If we do, it will be announced on twitter beforehand.`);
    interaction.update({
        embeds: [confirmPrivateKeyEmbed],
        components: [{
            type: 1,
            components: [confirmPrivateKeyButton, homeButton]
        }],
        ephemeral: true
    });
}

async function updateWalletStoredEmbed(interaction, walletAddressInput) { // Sends an embed saying the wallet has been stored.
    let walletStoredEmbed = createDefaultEmbed()
        .setDescription(`# Wallet Saved!
    \nWallet \`${walletAddressInput}\` has been saved.`);
    interaction.update({
        embeds: [walletStoredEmbed],
        components: [{
            type: 1,
            components: [deployProxyContractButton, homeButton]
        }],
        ephemeral: true
    });
}

async function updateInvalidPKEmbed(interaction) { // Sends an embed saying the PK entered was invalid
    let walletStoredEmbed = createDefaultEmbed()
        .setDescription(`# Invalid Private Key
\nThere was an error saving your wallet. Please try again.`);
    interaction.update({
        embeds: [walletStoredEmbed],
        components: [{
            type: 1,
            components: [deployProxyContractButton, homeButton]
        }],
        ephemeral: true
    });
}

async function updateDataDeletedEmbed(interaction) {
    let dataDeletedEmbed = createDefaultEmbed()
        .setDescription(`# Data Deleted
\nAll of your data has been deleted.`);
    interaction.update({
        embeds: [dataDeletedEmbed],
        components: [{
            type: 1,
            components: [homeButton]
        }],
        ephemeral: true
    });
}

// Proxy contract related embeds
async function updateWalletBeforeDeployEmbed(interaction) {
    let walletBeforeDeployEmbed = createDefaultEmbed()
        .setDescription(`# Wallet Required
\nTry inputted your wallet before trying to deploy your proxy contract.`);
    interaction.update({
        embeds: [walletBeforeDeployEmbed],
        components: [{
            type: 1,
            components: [inputPrivateKeyButton, homeButton]
        }],
        ephemeral: true
    });
}

async function updateConfirmProxyDeployEmbed(interaction) {
    let confirmProxyDeployEmbed = createDefaultEmbed()
        .setDescription(`# Deploy Proxy Contract
\nProxy Contracts are utilized by the bot in order to assure your transaction doesn't fail in the case that someone gets their snipe in prior to yours and your buy threshold is above where they swept to.
\nThis will cost you less than 25 cents.`);
    interaction.update({
        embeds: [confirmProxyDeployEmbed],
        components: [{
            type: 1,
            components: [deployProxyContractConfirmButton, homeButton]
        }],
        ephemeral: true
    });
}

async function updateProxyContractFoundEmbed(interaction, proxyContractAddress) {
    let proxyContractFoundEmbed = createDefaultEmbed()
        .setDescription(`# Proxy Contract Found!
\nWe were actually able to locate your previously deployed [proxy contract](https://basescan.org/address/${proxyContractAddress}):\`\`\`${proxyContractAddress}\`\`\``);
    interaction.update({
        embeds: [proxyContractFoundEmbed],
        components: [{
            type: 1,
            components: [homeButton]
        }],
        ephemeral: true
    });
}

async function updateDeployProxyContractEmbed(interaction) {
    let proxyContractAddress = await getProxyContract(interaction.user.id, `discord`); // Getting the proxy contract from user settings if it exists.
    if (proxyContractAddress == ``) { // If the user doesnt have a saved proxyContractAddress, grab their wallet and then check the network.
        let walletAddress = await getWalletAddress(interaction.user.id, `discord`);
        if (walletAddress == ``) {
            await updateWalletBeforeDeployEmbed(interaction);
        } else { // If the user doesn't have a wallet in the bot.
            let proxyFromNetwork = await getFriendTechBotAddress(baseProvider, walletAddress);
            if (proxyFromNetwork == null) {
                updateConfirmProxyDeployEmbed(interaction); // Embed to say confirm they want to deploy their proxy contract.
            } else {
                await setProxyContract(interaction.user.id, `discord`, proxyFromNetwork);
                await updateProxyContractFoundEmbed(interaction, proxyFromNetwork)// Embed to say we actually found their proxy contract.
            }
        }
    } else {
        await updateErrorEmbed(interaction);
    }
}


const SELF_SELL_0 = `1154968834609004544`;
const SELF_SELL_3 = `1154968962967281806`;
const SELF_SELL_9 = `1154969000300777522`;

async function sendSelfSellEmbed(discordClient, baseBalances, walletAddress, transactionHash, keysSold, kosettoInfo, twitterInfo, kosettoHolderInfo) {
    let selfSellEmbed = createDefaultEmbed()
        .setThumbnail(twitterInfo.PFPURL)
        .setTitle(`Self Sell Alert`)
        .setURL(`https://basescan.org/tx/${transactionHash}`)
        .setDescription(`# ${twitterInfo.displayName} ([@${kosettoInfo.twitterHandle}](https://twitter.com/${kosettoInfo.twitterHandle}))\n${twitterInfo.bio}\n\`\`\`${walletAddress}\`\`\`\`\`\`${kosettoInfo.twitterHandle}\`\`\``)
        .addFields({ name: `**Followers**`, value: `${twitterInfo.followerCount}`, inline: true })
        .addFields({ name: `**Tweets / Likes**`, value: `${twitterInfo.tweetCount} / ${twitterInfo.likeCount}`, inline: true })
        .addFields(getKeyFields(kosettoInfo.keyCount, kosettoInfo.keyHolders, kosettoInfo.keyPrice)) // Adding the key fields
        .addFields({ name: `**Keys Sold**`, value: `${keysSold}`, inline: true }) // Add keys sold field
        .addFields(getHoldersFields(kosettoHolderInfo, baseBalances))
        .addFields(getLinksField(walletAddress, kosettoInfo.twitterHandle)); // Adding the links field
    let CHANNEL_ID = SELF_SELL_0; // Setting the channel to send the embed to as the no requirement channel.
    switch (true) { // Changing the channel the embed will send to depending on the wallet balance.
        case keysSold > 9:
            CHANNEL_ID = SELF_SELL_9;
            break;
        case keysSold > 3:
            CHANNEL_ID = SELF_SELL_3;
            break;
    }
    const channel = discordClient.channels.cache.get(CHANNEL_ID); // Getting the channel to send the embed to
    channel.send({ embeds: [selfSellEmbed], components: [getBuyButtonsRow(walletAddress, `WalletBuy`)] }); // Sending the embed
}

async function updateProxyNotFoundEmbed(interaction) {
    let proxyNotFoundEmbed = createDefaultEmbed()
        .setDescription(`# Proxy Contract Required
    \nPlease deploy your proxy contract before trying this.`);
    interaction.update({
        embeds: [proxyNotFoundEmbed],
        components: [{
            type: 1,
            components: [deployProxyContractButton, homeButton]
        }],
        ephemeral: true
    });

}

async function updateSellFromSelectionEmbed(interaction) {
    let sellFromSelectionEmbed = createDefaultEmbed()
        .setDescription(`# Do you want to sell from your wallet or from your contract?
        \nPlease select an option below.`);
    let sellFromMenu = new StringSelectMenuBuilder() // Creating the select menu
        .setCustomId('sellFromMenu')
        .setPlaceholder('Where do you want to sell from?')
        .addOptions(sellFromOptions);
    let firstActionRow = new ActionRowBuilder().addComponents(sellFromMenu); // Creating the action row.
    await interaction.update({
        embeds: [sellFromSelectionEmbed],
        components: [firstActionRow],
        ephemeral: true
    });
}

const FUNDING_1 = `1155656319173398608`;
const FUNDING_25 = `1155739119620735018`;
const FUNDING_5 = `1155739202173022239`;
async function sendBridgeTransactionEmbed(discordClient, receivingAddress, ethAmount, transactionHash, kosettoInfo, twitterInfo, kosettoHolderInfo, baseBalances) {
    let bridgeTransactionEmbed = createDefaultEmbed()
        .setTitle(`Base Bridge Detected`)
        .setURL(`https://etherscan.io/tx/${transactionHash}`)
        .setThumbnail(twitterInfo.PFPURL)
        .setDescription(`# ${kosettoInfo.twitterDisplayName} ([@${kosettoInfo.twitterHandle}](https://twitter.com/${kosettoInfo.twitterHandle}))\n${twitterInfo.bio}\n\`\`\`${kosettoInfo.twitterHandle}\`\`\`\`\`\`${receivingAddress}\`\`\`
    [@${kosettoInfo.twitterHandle}](https://twitter.com/${kosettoInfo.twitterHandle}) is bridging **${ethAmount}** ETH to base.`)
        .addFields({ name: `**Followers**`, value: `${twitterInfo.followerCount}`, inline: true })
        .addFields({ name: `**Tweets / Likes**`, value: `${twitterInfo.tweetCount} / ${twitterInfo.likeCount}`, inline: true })
        .addFields({ name: `**Base Balance**`, value: `${baseBalances[0]}`, inline: true }) // Adding base balance field.
        .addFields(getKeyFields(kosettoInfo.keyCount, kosettoInfo.keyHolders, kosettoInfo.keyPrice)) // Adding the key fields
        .addFields(getHoldersFields(kosettoHolderInfo, baseBalances))
        .addFields(getLinksField(receivingAddress, kosettoInfo.twitterHandle));
    let CHANNEL_ID; // Initialising channel ID
    switch (true) { // Changing the channel the embed will send to depending on the funding amount.
        case ethAmount > 5:
            CHANNEL_ID = FUNDING_5;
            break;
        case ethAmount > 2.5:
            CHANNEL_ID = FUNDING_25;
            break;
        case ethAmount > 1:
            CHANNEL_ID = FUNDING_1;
            break;
        default:
            return;
    }
    const channel = discordClient.channels.cache.get(CHANNEL_ID); // Getting the channel to send the embed to
    channel.send({ embeds: [bridgeTransactionEmbed], components: [getBuyButtonsRow(receivingAddress, `WalletBuy`)] }); // Sending the embed
}

const MUTUAL_003 = `1158080642760835113`;
const MUTUAL_009 = `1158081046282260490`;
const MUTUAL_02 = `1158081087285764147`;
const MUTUAL_HIGH = `1158081246484779130`;
async function sendMutualTransactionEmbed(discordClient, baseBalances, walletAddress, transactionHash, kosettoInfo, twitterInfo, kosettoHolderInfo) {
    let mutualEmbed = createDefaultEmbed()
        .setThumbnail(twitterInfo.PFPURL)
        .setTitle(`3,3 Alert`)
        .setURL(`https://basescan.org/tx/${transactionHash}`)
        .setDescription(`# ${twitterInfo.displayName} ([@${kosettoInfo.twitterHandle}](https://twitter.com/${kosettoInfo.twitterHandle}))\n${twitterInfo.bio}\n\`\`\`${walletAddress}\`\`\`\`\`\`${kosettoInfo.twitterHandle}\`\`\``)
        .addFields({ name: `**Followers**`, value: `${twitterInfo.followerCount}`, inline: true })
        .addFields({ name: `**Tweets / Likes**`, value: `${twitterInfo.tweetCount} **/** ${twitterInfo.likeCount}`, inline: true })
        .addFields({ name: `**ETH Balance**`, value: `${baseBalances[0]}`, inline: true })
        .addFields(getKeyFields(kosettoInfo.keyCount, kosettoInfo.keyHolders, kosettoInfo.keyPrice)) // Adding the key fields
        .addFields(getHoldersFields(kosettoHolderInfo, baseBalances))
        .addFields(getLinksField(walletAddress, kosettoInfo.twitterHandle)); // Adding the links field
    let CHANNEL_ID = MUTUAL_HIGH; // Setting the channel to send the embed to as the no requirement channel.
    let keyPrice = parseFloat(kosettoInfo.keyPrice).toPrecision(3);
    switch (true) { // Changing the channel the embed will send to depending on the wallet balance.
        case keyPrice < 0.03:
            CHANNEL_ID = MUTUAL_003;
            break;
        case keyPrice < 0.09:
            CHANNEL_ID = MUTUAL_009;
            break;
        case keyPrice < 0.2:
            CHANNEL_ID = MUTUAL_02;
            break;
    }
    const channel = discordClient.channels.cache.get(CHANNEL_ID); // Getting the channel to send the embed to
    channel.send({ embeds: [mutualEmbed], components: [getBuyButtonsRow(walletAddress, `WalletBuy`)] }); // Sending the embed
}

async function sendHolderEmbed(interaction) {
    let holderEmbed = createDefaultEmbed()
        .setDescription(`# Holder Only Channel
        This channel is for holders of [Shady](https://www.friend.tech/rooms/0x414c102fee272844a8afb817464942e101034e38) or [Billionaire](https://www.friend.tech/rooms/0x3d079438778d779e4fbbd36f9a573eb9364fd702) along with users in <#1158952427341492224>.`);
    await interaction.channel.send({ embeds: [holderEmbed] });
}

async function awaitingFundingEmbed(interaction) { // Sends an embed when a quick spamtask is waiting for funding.

}

async function replyNotReadyEmbed(interaction) { // Sends an embed saying that the interaction isn't ready for people to use it.
    let notReadyEmbed = createDefaultEmbed()
        .setDescription(`# Feature In Production
    \nHey! This feature is still being developed or tested. We appreciate your patience.`)
    let notReadyMessage = {
        embeds: [notReadyEmbed],
        ephemeral: true
    };
    await interaction.reply(notReadyMessage);
}

function getTwitterFields(twitterInfo) {
    let followersField = { name: `**Followers**`, value: `${twitterInfo.followerCount}`, inline: false };
    let tweetsField = { name: `**Tweets**`, value: `${twitterInfo.tweetCount}`, inline: true };
    let likesField = { name: `**Likes**`, value: `${twitterInfo.likeCount}`, inline: true };
    return { followersField, tweetsField, likesField };
}

async function dmCrashPreventedEmbed(discordClient, interaction) {
    let crashPreventedEmbed = createDefaultEmbed()
        .setDescription(`# Something Went Wrong!
    \nWhatever you just clicked on would have crashed the bot! Please DM <@488095760160915481> with details so this can be patched.`);
    await sendDM(discordClient, interaction.user.id, crashPreventedEmbed);
}

async function sendDM(discordClient, userId, embed) {
    try {
        const user = await discordClient.users.fetch(userId);
        if (!user) {
            console.error(`User with ID ${userId} not found.`);
            return;
        }

        await user.send({
            embeds: [embed],
        });
        console.log(`Sent DM to ${user.tag}`);
    } catch (error) {
        console.error(`Error sending DM: ${error}`);
    }
}

module.exports = {
    replySniperMenuEmbed, replyTaskTypeEmbed, updateInvalidHandleInputEmbed, updateInvalidSweepPriceInputEmbed, updateInvalidPrioInputEmbed, updateSnipeTaskAddedEmbed,
    updateInvalidWalletAddressInputEmbed, updateSpamTaskAddedEmbed, updateManageWhichTasksEmbed, updateNoSnipeTasksEmbed, updateNoSpamTasksEmbed, updateManageSpamTasksEmbed,
    updateEditSpamTaskEmbed, updateSpamTaskWalletChangedEmbed, updateErrorEmbed, updateSpamTaskRemovedEmbed, updateNoSpamSettingsEmbed, updateInvalidTxPerSecondInputEmbed,
    updateInvalidStartDelayInputEmbed, updateInvalidDurationInputEmbed, updateSpamSettingsSavedEmbed, updateNoSpamTaskFoundEmbed, sendSelfBuyEmbed,
    sendFirstBuyEmbed, sendSalesEmbed, updateManageSnipeTasksEmbed, updateEditSnipeTaskEmbed, updateSnipeTaskSweepPriceChangedEmbed,
    updateNoSnipeTaskFoundEmbed, updateSnipeTaskPrioChangedEmbed, updateSnipeTaskRemovedEmbed, updateContractSellingEmbed, updateNoKeysHeldContractEmbed, sendWelcomeEmbed,
    replyAdminOnlyEmbed, updateContractSellKeyEmbed, updateSellTxSentEmbed, sendNewSignUpEmbed, updateNoWalletFoundEmbed, sendFailedSnipesEmbed, updateSpamTaskSweepPriceChangedEmbed,
    updateSettingsEmbed, updateConfirmPrivateKeyEmbed, updateWalletStoredEmbed, updateInvalidPKEmbed, updateDataDeletedEmbed, updateWalletBeforeDeployEmbed, updateDeployProxyContractEmbed,
    sendSelfSellEmbed, updateProxyNotFoundEmbed, updateSellFromSelectionEmbed, updateWalletSellingEmbed, updateWalletSellKeyEmbed, sendBridgeTransactionEmbed, updateInvalidDepositAmountEmbed,
    updateNotEnoughEthEmbed, sendMutualTransactionEmbed, updateNoKeysHeldWalletEmbed, sendHolderEmbed, replyNotReadyEmbed, dmCrashPreventedEmbed
};