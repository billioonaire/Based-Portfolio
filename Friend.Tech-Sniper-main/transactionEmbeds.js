const ethers = require(`ethers`); // Importing the ethers library.
const { EmbedBuilder, WebhookClient, Webhook } = require('discord.js');

const { confirmWalletBuyButton, inputPrivateKeyButton, homeButton } = require(`./buttonCreator.js`);
const { getWalletAddress } = require(`./dataHandler.js`);

// Webhook Links
const quickBuySuccessWebhook = new WebhookClient({ url: `https://discord.com/api/webhooks/1155283888160116776/yxfaF_sNAuIXjF_oN4Jimg7dChHvu49DT_S1ENGntb4o68X2eQy-NbHqwnDsYxCbiP7b` });
const snipeSuccessWebhook = new WebhookClient({ url: `https://discord.com/api/webhooks/1157120605980725298/4pQN0SjeonHQ14dpuFYxZklgi7Uo_2kyWbZXWqoaGVKo1wLRPCdA6yiNpYNNmf4-zFuj` });
const spamSuccessWebhook = new WebhookClient({ url: `https://ptb.discord.com/api/webhooks/1157911949426823250/D-Fo3ZsuMB6_zDvC5sjMk7J1lLthkVwBh--UkpDy5MRDmizHrcaKOG72qF_QVh2ycDvc` });

const baseProvider = new ethers.providers.JsonRpcProvider("https://base-mainnet.g.alchemy.com/v2/3jvxo1TC_IJ28e-SmuOULOlJJtzF6hCL"); // Base Provider

const FRIEND_TECH_CONTRACT = "YOUR_FRIEND_TECH_CONTRACT_ADDRESS";
const friendTechABI = require("./abi/friendTechABI.json");
const { kosettoAddressCall } = require('./apiCalls.js');
const friendTechContract = new ethers.Contract(FRIEND_TECH_CONTRACT, friendTechABI, baseProvider);



function createDefaultEmbed() { // A function to create a default Unchained embed.
    let defaultEmbed = new EmbedBuilder()
        .setColor('#ff045f')
        .setTimestamp()
        .setFooter({ text: "Unchained", iconURL: "https://cdn.discordapp.com/attachments/888244235407605800/1080223489224626308/UNCHAINED_AGENCY_LOGO_TWITTER_PROFILE_PICTURE_CIRCLE.png" });
    return defaultEmbed;
}

async function replyWaitingEmbed(interaction) {
    let waitingEmbed = createDefaultEmbed()
        .setImage(`https://cdn.discordapp.com/attachments/1082819475151265802/1092665018899763281/ANIM_BANNER_V2.gif`);
    let waitingMenuMessage = {
        embeds: [waitingEmbed],
        components: [],
        ephemeral: true
    };
    await interaction.reply(waitingMenuMessage);
}

async function replyRoleRequiredEmbed(interaction, roleID) {
    let roleRequiredEmbed = createDefaultEmbed()
        .setDescription(`# No Permissions!
    \nYou need the role of <@&${roleID}> to use this command.`);
    interaction.reply({
        embeds: [roleRequiredEmbed],
        components: [
            {
                type: 1, // 1 signifies an action row
                components: [homeButton]
            }],
        ephemeral: true
    });
}

async function editReplyWalletRequiredEmbed(interaction) {
    let walletBeforeDeployEmbed = createDefaultEmbed()
        .setDescription(`# Wallet Required
\nTry inputting your wallet before trying to interact with the blockchain.`);
    interaction.editReply({
        embeds: [walletBeforeDeployEmbed],
        components: [{
            type: 1,
            components: [inputPrivateKeyButton, homeButton]
        }],
        ephemeral: true
    });
}

async function replyConfirmWalletBuyEmbed(interaction, keyAddress, buyAmount, twitterHandleInput) {
    await replyWaitingEmbed(interaction);
    let totalCost = await friendTechContract.getBuyPriceAfterFee(keyAddress, buyAmount);
    totalCost = ethers.utils.formatUnits(totalCost, `ether`);
    let confirmWalletBuyEmbed = createDefaultEmbed()
        .setDescription(`# Confirm Buy
    \nAre you sure you want to buy **${buyAmount}** of **[@${twitterHandleInput}](https://twitter.com/${twitterHandleInput})**'s keys for __**${parseFloat(totalCost)}**__ ETH?\`\`\`${keyAddress}\`\`\``);
    let walletAddress = await getWalletAddress(interaction.user.id, `discord`);
    if (walletAddress == ``) {
        await editReplyWalletRequiredEmbed(interaction); // If the user doesn't have a wallet in the bot.
    } else {
        interaction.editReply({
            embeds: [confirmWalletBuyEmbed],
            components: [
                {
                    type: 1, // 1 signifies an action row
                    components: [confirmWalletBuyButton]
                }],
            ephemeral: true
        });
    }
}

async function updatePendingBuyTransactionEmbed(interaction, walletOrContract, ethAmount, keyAddress, keyAmount, twitterHandle, transactionHash) {
    // walletOrContract should either be `wallet` or `contract`
    let pendingTransactionEmbed = createDefaultEmbed()
        .setDescription(`# [Transaction Pending](https://basescan.org/tx/${transactionHash})
    \nYour **[transaction](https://basescan.org/tx/${transactionHash})** to buy ${keyAmount} of **[@${twitterHandle}](https://twitter.com/${twitterHandle})**'s keys for **${ethAmount} ETH** using your ${walletOrContract} has been sent.\`\`\`${keyAddress}\`\`\``)
        .setColor(`#ffe800`);
    interaction.update({
        embeds: [pendingTransactionEmbed],
        components: [],
        ephemeral: true
    });
}

async function updateBuyTransactionConfirmedEmbed(interaction, walletOrContract, ethAmount, keyAddress, keyAmount, twitterHandle, transactionHash) {
    // walletOrContract should either be `wallet` or `contract`
    let successfulTransactionEmbed = createDefaultEmbed()
        .setDescription(`# [Transaction Confirmed](https://basescan.org/tx/${transactionHash})
\nYour **[transaction](https://basescan.org/tx/${transactionHash})** to buy ${keyAmount} of **[@${twitterHandle}](https://twitter.com/${twitterHandle})**'s keys for **${ethAmount} ETH** using your ${walletOrContract} was successful.\`\`\`${keyAddress}\`\`\``)
        .setColor(`#32a852`);
    // Creating the webhook and sending it.
    let successfulTransactionWebhookEmbed = createDefaultEmbed()
        .setDescription(`# Buy Transaction Successful!
    \n<@${interaction.user.id}> successfully bought **${keyAmount}** of **[@${twitterHandle}](https://twitter.com/${twitterHandle})**'s keys for **${ethAmount} ETH**.`)
        .addFields(getTxLinksField(keyAddress, transactionHash, twitterHandle));
    quickBuySuccessWebhook.send({ embeds: [successfulTransactionWebhookEmbed] });

    interaction.editReply({
        embeds: [successfulTransactionEmbed],
        ephemeral: true
    });
}

async function updateBuyTransactionFailedEmbed(interaction, walletOrContract, ethAmount, keyAddress, keyAmount, twitterHandle, transactionHash) {
    // walletOrContract should either be `wallet` or `contract`
    let failedTransactionEmbed = createDefaultEmbed()
        .setDescription(`# [Transaction Failed](https://basescan.org/tx/${transactionHash})
\nYour **[transaction](https://basescan.org/tx/${transactionHash})** to buy ${keyAmount} of **[@${twitterHandle}](https://twitter.com/${twitterHandle})**'s keys for **${ethAmount} ETH** using your ${walletOrContract} has failed.

This means that someone bought the share at the price your transaction was for - try to click "Confirm Buy" just a bit faster to avoid this.\`\`\`${keyAddress}\`\`\``)
        .setColor(`#ff045f`);
    interaction.editReply({
        embeds: [failedTransactionEmbed],
        ephemeral: true
    });
}

async function updateDeployPendingTransaction(interaction, transactionHash) {
    let pendingDeployTransactionEmbed = createDefaultEmbed()
        .setDescription(`# [Transaction Pending](https://basescan.org/tx/${transactionHash})
    \nYour **[transaction](https://basescan.org/tx/${transactionHash})** to deploy your Proxy Contract is pending!`)
        .setColor(`#ffe800`);
    interaction.update({
        embeds: [pendingDeployTransactionEmbed],
        components: [],
        ephemeral: true
    });
}

async function updateDeployConfirmedEmbed(interaction, deployedAddress, transactionHash) {
    let successfulTransactionEmbed = createDefaultEmbed()
        .setDescription(`# [Transaction Confirmed](https://basescan.org/tx/${transactionHash})
\nYour **[transaction](https://basescan.org/tx/${transactionHash})** to deploy your Proxy Contract has confirmed!\`\`\`${deployedAddress}\`\`\``)
        .setColor(`#32a852`);
    interaction.editReply({
        embeds: [successfulTransactionEmbed],
        components: [{
            type: 1,
            components: [homeButton]
        }],
        ephemeral: true
    });
}

async function updateDeployFailedEmbed(interaction, transactionHash) {
    let failedTransactionEmbed = createDefaultEmbed()
        .setDescription(`# [Transaction Failed](https://basescan.org/tx/${transactionHash})
\nYour **[transaction](https://basescan.org/tx/${transactionHash})** to deploy your Proxy Contract has failed!`)
        .setColor(`#ff045f`);
    interaction.editReply({
        embeds: [failedTransactionEmbed],
        ephemeral: true
    });
}

async function updateNotEnoughFundsEmbed(interaction) {
    let notEnoughFundsEmbed = createDefaultEmbed()
        .setDescription(`# Not enough funds!
    \nYou need more funds in your wallet to execute this transaction!`);
    interaction.update({
        embeds: [notEnoughFundsEmbed],
        ephemeral: true
    });
}

async function updateRPCErrorEmbed(interaction) {
    let rpcErrorEmbed = createDefaultEmbed()
        .setDescription(`# RPC Error!
\nThere was an issue with the RPC! Retry the transaction and let <@488095760160915481> know of this error.`);
    interaction.update({
        embeds: [rpcErrorEmbed],
        ephemeral: true
    });
}

// Sell transactions
async function updatePendingSellTransactionEmbed(interaction, walletOrContract, keyAddress, keyAmount, twitterHandle, transactionHash) {
    // walletOrContract should either be `wallet` or `contract`
    let pendingTransactionEmbed = createDefaultEmbed()
        .setDescription(`# [Transaction Pending](https://basescan.org/tx/${transactionHash})
    \nYour **[transaction](https://basescan.org/tx/${transactionHash})** to sell ${keyAmount} of **[@${twitterHandle}](https://twitter.com/${twitterHandle})**'s keys using your ${walletOrContract} has been sent.\`\`\`${keyAddress}\`\`\``)
        .setColor(`#ffe800`);
    interaction.update({
        embeds: [pendingTransactionEmbed],
        components: [],
        ephemeral: true
    });
}

async function updateSellTransactionConfirmedEmbed(interaction, walletOrContract, keyAddress, keyAmount, ethBeforeFees, ethAfterFees, twitterHandle, transactionHash) {
    // walletOrContract should either be `wallet` or `contract`
    let transactionConfirmedEmbed = createDefaultEmbed()
        .setDescription(`# [Transaction Confirmed](https://basescan.org/tx/${transactionHash})
\nYour **[transaction](https://basescan.org/tx/${transactionHash})** to sell ${keyAmount} of **[@${twitterHandle}](https://twitter.com/${twitterHandle})**'s keys for **${ethBeforeFees} (${ethAfterFees}) ETH** using your ${walletOrContract} was successful.\`\`\`${keyAddress}\`\`\``)
        .setColor(`#32a852`);

    interaction.editReply({
        embeds: [transactionConfirmedEmbed],
        components: [{
            type: 1,
            components: [homeButton]
        }],
        ephemeral: true
    });
}

async function updateSellTransactionFailedEmbed(interaction, walletOrContract, keyAddress, keyAmount, twitterHandle, transactionHash) {
    // walletOrContract should either be `wallet` or `contract`
    let failedTransactionEmbed = createDefaultEmbed()
        .setDescription(`# [Transaction Failed](https://basescan.org/tx/${transactionHash})
\nYour **[transaction](https://basescan.org/tx/${transactionHash})** to sell ${keyAmount} of **[@${twitterHandle}](https://twitter.com/${twitterHandle})**'s keys using your ${walletOrContract} has failed.\`\`\`${keyAddress}\`\`\``)
        .setColor(`#ff045f`);
    interaction.editReply({
        embeds: [failedTransactionEmbed],
        ephemeral: true
    });
}

async function updateSnipeTransactionConfirmedEmbed(discord_id, walletOrContract, ethAmount, gasEth, keyAddress, keyAmount, twitterHandle, transactionHash) {
    // walletOrContract should either be `wallet` or `contract`
    let successfulTransactionWebhookEmbed = createDefaultEmbed() // Creating the webhook and sending it.
        .setDescription(`# [Snipe Successful!](https://basescan.org/tx/${transactionHash})
    \n<@${discord_id}> successfully sniped **${keyAmount}** of **[@${twitterHandle}](https://twitter.com/${twitterHandle})**'s keys for **${ethAmount} ETH** and **${gasEth} ETH** in gas using their ${walletOrContract}.`)
        .addFields(getTxLinksField(keyAddress, transactionHash, twitterHandle))
        .setColor(`#32a852`); // Setting the color to green.
    snipeSuccessWebhook.send({ embeds: [successfulTransactionWebhookEmbed] });
}

async function dmSnipeTransactionFailedEmbed(discordClient, discord_id, walletOrContract, keyAddress, twitterHandle, transactionHash) {
    // walletOrContract should either be `wallet` or `contract`
    let failedTransactionEmbed = createDefaultEmbed()
        .setDescription(`# [Transaction Failed](https://basescan.org/tx/${transactionHash})
\n<@${discord_id}> failed to snipe **[@${twitterHandle}](https://twitter.com/${twitterHandle})**'s keys using their ${walletOrContract}.\n\`\`\`${keyAddress}\`\`\``)
        .addFields(getTxLinksField(keyAddress, transactionHash, twitterHandle))
        .setColor(`#ff045f`);
    await sendDM(discordClient, discord_id, failedTransactionEmbed); // Sending the user a dm saying their snipe failed.
}

function getTxLinksField(keyAddress, transactionHash, twitterHandle) {
    return { name: `**Links**`, value: `**<:friendsTech:1144396944756723807> [friend.tech](https://www.friend.tech/rooms/${keyAddress}) · <:twitter:1079557924382326835> [Twitter](https://twitter.com/${twitterHandle}) · <:basescan:1144396907519680574> [Basescan](https://basescan.org/address/${transactionHash})**` };
}

// Withdraw Transactions
async function updatePendingWithdrawTransactionEmbed(interaction, proxyContractAddress, transactionHash) {
    let pendingTransactionEmbed = createDefaultEmbed()
        .setDescription(`# [Transaction Pending](https://basescan.org/tx/${transactionHash})
    \nYour **[transaction](https://basescan.org/tx/${transactionHash})** to withdraw all of your ETH from your **[proxy contract](https://basescan.org/address/${proxyContractAddress})** has been sent.`)
        .setColor(`#ffe800`);
    pendingTransactionEmbed.addFields({
        name: `**Links**`,
        value: `**<:basescan:1144396907519680574> [Proxy Contract](https://basescan.org/address/${proxyContractAddress}) · <:basescan:1144396907519680574> [Tx](https://basescan.org/tx/${transactionHash})**`
    });
    interaction.update({
        embeds: [pendingTransactionEmbed],
        components: [],
        ephemeral: true
    });
}

async function updateWithdrawTransactionConfirmedEmbed(interaction, proxyContractAddress, transactionHash) {
    let transactionConfirmedEmbed = createDefaultEmbed()
        .setDescription(`# [Withdraw Confirmed](https://basescan.org/tx/${transactionHash})
    \nYou have successfully **[withdrew](https://basescan.org/tx/${transactionHash})** all of your ETH from your your **[proxy contract](https://basescan.org/address/${proxyContractAddress})**.`)
        .setColor(`#32a852`) // Setting color to green.
        .addFields({ // Adding links field.
            name: `**Links**`,
            value: `**<:basescan:1144396907519680574> [Proxy Contract](https://basescan.org/address/${proxyContractAddress}) · <:basescan:1144396907519680574> [Tx](https://basescan.org/tx/${transactionHash})**`
        });
    interaction.editReply({
        embeds: [transactionConfirmedEmbed],
        components: [{
            type: 1,
            components: [homeButton]
        }],
        ephemeral: true
    });
}

// Deposit Transaction
async function updatePendingDepositTransactionEmbed(interaction, proxyContractAddress, transactionHash, ethAmount) {
    let pendingTransactionEmbed = createDefaultEmbed()
        .setDescription(`# [Deposit Pending](https://basescan.org/tx/${transactionHash})
    \nYour **[transaction](https://basescan.org/tx/${transactionHash})** to deposit __**${ethAmount}**__ into your **[proxy contract](https://basescan.org/address/${proxyContractAddress})** has been sent.`)
        .setColor(`#ffe800`);
    pendingTransactionEmbed.addFields({
        name: `**Links**`,
        value: `**<:basescan:1144396907519680574> [Proxy Contract](https://basescan.org/address/${proxyContractAddress}) · <:basescan:1144396907519680574> [Tx](https://basescan.org/tx/${transactionHash})**`
    });
    interaction.update({
        embeds: [pendingTransactionEmbed],
        components: [],
        ephemeral: true
    });
}

async function updateDepositTransactionConfirmedEmbed(interaction, proxyContractAddress, transactionHash, ethAmount) {
    console.log(transactionHash)
    let transactionConfirmedEmbed = createDefaultEmbed()
        .setDescription(`# [Deposit Confirmed](https://basescan.org/tx/${transactionHash})
    \nYou have successfully deposited __**${ethAmount}**__ ETH into your **[proxy contract](https://basescan.org/address/${proxyContractAddress})**.`)
        .setColor(`#32a852`) // Setting color to green.
        .addFields({ // Adding links field.
            name: `**Links**`,
            value: `**<:basescan:1144396907519680574> [Proxy Contract](https://basescan.org/address/${proxyContractAddress}) · <:basescan:1144396907519680574> [Tx](https://basescan.org/tx/${transactionHash})**`
        });
    interaction.editReply({
        embeds: [transactionConfirmedEmbed],
        components: [{
            type: 1,
            components: [homeButton]
        }],
        ephemeral: true
    });
}

// Contract Selling
async function sendContractSellPendingEmbed(interaction, keyAddress, sellAmount, twitterHandleInput, proxyContractAddress, transactionHash) {
    let pendingTransactionEmbed = createDefaultEmbed()
        .setDescription(`# [Sell Pending](https://basescan.org/tx/${transactionHash})
\nYour [transaction](https://basescan.org/tx/${transactionHash}) to sell __**${sellAmount}**__ of **[@${twitterHandleInput}](https://twitter.com/${twitterHandleInput})**'s keys from your __[proxy contract](https://basescan.org/address/${proxyContractAddress})__ is pending.`)
        .setColor(`#ffe800`);
    pendingTransactionEmbed.addFields({
        name: `**Links**`,
        value: `**<:basescan:1144396907519680574> [Proxy Contract](https://basescan.org/address/${proxyContractAddress}) · <:basescan:1144396907519680574> [Tx](https://basescan.org/tx/${transactionHash}) · <:friendsTech:1144396944756723807> [friend.tech](https://www.friend.tech/rooms/${keyAddress})**`
    });
    interaction.update({
        embeds: [pendingTransactionEmbed],
        components: [],
        ephemeral: true
    });
}

async function sendContractSellConfirmedEmbed(interaction, keyAddress, sellAmount, twitterHandleInput, proxyContractAddress, transactionHash, ethAmount) {
    let transactionConfirmedEmbed = createDefaultEmbed()
        .setDescription(`# [Sell Confirmed](https://basescan.org/tx/${transactionHash})
\nYour [transaction](https://basescan.org/tx/${transactionHash}) to sell __**${sellAmount}**__ of **[@${twitterHandleInput}](https://twitter.com/${twitterHandleInput})**'s keys from your __[proxy contract](https://basescan.org/address/${proxyContractAddress})__ for **${ethAmount}** ETH has confirmed.`)
        .setColor(`#32a852`) // Setting color to green.
    transactionConfirmedEmbed.addFields({
        name: `**Links**`,
        value: `**<:basescan:1144396907519680574> [Proxy Contract](https://basescan.org/address/${proxyContractAddress}) · <:basescan:1144396907519680574> [Tx](https://basescan.org/tx/${transactionHash}) · <:friendsTech:1144396944756723807> [friend.tech](https://www.friend.tech/rooms/${keyAddress})**`
    });
    interaction.editReply({
        embeds: [transactionConfirmedEmbed],
        components: [{
            type: 1,
            components: [homeButton]
        }],
        ephemeral: true
    });
}

// Spam Tasks
async function sendSpamTaskSuccessEmbed(discord_id, ethAmount, keyAddress, keyAmount, totalTransactions, totalGasUsed) {
    let kosettoInfo = await kosettoAddressCall(keyAddress);
    let twitterHandle = `ERROR`; // Initialising the twitter handle to error.
    if (kosettoInfo) {
        twitterHandle = kosettoInfo.twitterHandle; // If kosetto was called properly, set the twitter handle.
    }
    let successfulTransactionWebhookEmbed = createDefaultEmbed() // Creating the webhook and sending it.
        .setDescription(`# Spam Task Successful!
    \n<@${discord_id}> successfully sniped **${keyAmount}** of **[@${twitterHandle}](https://twitter.com/${twitterHandle})**'s keys for **${ethAmount}** ETH spamming with their proxy contract.`)
        .addFields({ name: `**Transactions Sent**`, value: `${totalTransactions}`, inline: true })
        .addFields({ name: `**Total Gas Used**`, value: `${totalGasUsed}`, inline: true })
        .addFields({ name: `**Average Key Cost**`, value: `${(ethAmount + totalGasUsed) / keyAmount} ETH / Key`, inline: true })
        .addFields({ name: `**Links**`, value: `**<:friendsTech:1144396944756723807> [friend.tech](https://www.friend.tech/rooms/${keyAddress}) · <:twitter:1079557924382326835> [Twitter](https://twitter.com/${twitterHandle})**` })
        .setColor(`#32a852`); // Setting the color to green.
    spamSuccessWebhook.send({ embeds: [successfulTransactionWebhookEmbed] });
}

async function dmSpamTaskFailedEmbed(discordClient, discord_id, walletOrContract, keyAddress, totalTransactions, totalGasUsed) {
    let kosettoInfo = await kosettoAddressCall(keyAddress);
    let twitterHandle = `ERROR`; // Initialising the twitter handle to error.
    if (kosettoInfo) {
        twitterHandle = kosettoInfo.twitterHandle; // If kosetto was called properly, set the twitter handle.
    }
    let failedTransactionEmbed = createDefaultEmbed()
        .setDescription(`# Spam Task Failed)
\n<@${discord_id}> failed to snipe **[@${twitterHandle}](https://twitter.com/${twitterHandle})**'s keys by spamming with their ${walletOrContract}.\n\`\`\`${keyAddress}\`\`\``)
        .addFields({ name: `**Transactions Sent**`, value: `${totalTransactions}`, inline: true })
        .addFields({ name: `**Total Gas Used**`, value: `${totalGasUsed}`, inline: false })
        .addFields({ name: `**Links**`, value: `**<:friendsTech:1144396944756723807> [friend.tech](https://www.friend.tech/rooms/${keyAddress}) · <:twitter:1079557924382326835> [Twitter](https://twitter.com/${twitterHandle})**` })
        .setColor(`#ff045f`);
    await sendDM(discordClient, discord_id, failedTransactionEmbed); // Sending the user a dm saying their snipe failed.
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
    replyConfirmWalletBuyEmbed, replyRoleRequiredEmbed, updatePendingBuyTransactionEmbed, updateBuyTransactionConfirmedEmbed, updateBuyTransactionFailedEmbed,
    updateDeployPendingTransaction, updateDeployConfirmedEmbed, updateDeployFailedEmbed, updateNotEnoughFundsEmbed, updateRPCErrorEmbed, updatePendingSellTransactionEmbed,
    updateSellTransactionConfirmedEmbed, updateSellTransactionFailedEmbed, updateSnipeTransactionConfirmedEmbed, dmSnipeTransactionFailedEmbed, updatePendingWithdrawTransactionEmbed,
    updateWithdrawTransactionConfirmedEmbed, updatePendingDepositTransactionEmbed, updateDepositTransactionConfirmedEmbed, sendContractSellPendingEmbed, sendContractSellConfirmedEmbed,
    sendSpamTaskSuccessEmbed, dmSpamTaskFailedEmbed
};