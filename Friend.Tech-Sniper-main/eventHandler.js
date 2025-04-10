// This file is for handling events that must remain synchronous, mostly to be used in friendtechMonitors.js.
const { kosettoAddressCall, getTwitterInfo, kosettoHoldersCall } = require(`./apiCalls.js`);
const { sendFirstBuyEmbed, sendSelfBuyEmbed, sendSelfSellEmbed, sendBridgeTransactionEmbed, sendSalesEmbed, sendMutualTransactionEmbed } = require(`./embedCreator.js`);
const ethersInteractions = require(`./ethersInteractions.js`);
const ethers = require('ethers');

// Address Constants
const SHADY_ADDRESS = `0x414c102fee272844a8afb817464942e101034e38`;
const BILLIONAIRE_ADDRESS = `0x3d079438778d779e4fbbd36f9a573eb9364fd702`;

async function handleFriendTechEvents(discordClient, traderAddress, keyAddress, keyAmount, keySupply, ethAmount, isBuy, transactionHash, taskHandler) {
    let is33 = await ethersInteractions.is33ing(traderAddress, keyAddress);
    const firstBuyCondition = ethAmount == 0 && isBuy;
    const selfBuyCondition = traderAddress == keyAddress && isBuy && keySupply != 1;
    const selfSellCondition = traderAddress == keyAddress && !isBuy && keySupply != 1;
    const shadyOrBillionaireBuyCondition = keyAddress == SHADY_ADDRESS && isBuy || keyAddress == BILLIONAIRE_ADDRESS && isBuy;
    const anyCondition = firstBuyCondition || selfBuyCondition || selfSellCondition || shadyOrBillionaireBuyCondition || is33;
    if (anyCondition) {
        let kosettoInfo = await kosettoAddressCall(traderAddress);
        if (kosettoInfo.registered == false) { // Ends execution if the address isn't registered.
            console.log(`Unable to get kossetoAddressCall for ${traderAddress}`);
            return;
        }
        let twitterInfo = await getTwitterInfo(kosettoInfo.twitterHandle);
        if (twitterInfo == null) { // Ends execution if twitter info wasn't able to be fetched.
            console.log(`Couldn't find twitter for ${kosettoInfo.twitterHandle}.`);
            return;
        }
        let kosettoHolderInfo = await kosettoHoldersCall(traderAddress);
        if (kosettoHolderInfo == null) { // Ends execution if kosetto holder info wasn't able to be fetched
            console.log(`Unable to get holderInfo for ${traderAddress}.`);
            return;
        }
        let baseBalances = await ethersInteractions.getBaseBalancesForHolders(traderAddress, kosettoHolderInfo); // Getting the base balance.
        if (baseBalances == null) { // Ends execution if the base balances of holders for wasn't able to be fetched.
            console.log(`Unable to get baseBalances of the holders of  for ${traderAddress}.`);
            return;
        }
        if (is33 && isBuy && traderAddress != keyAddress) {
            console.log(`is33: ${is33} keyAddress: ${keyAddress} traderAddress: ${traderAddress}`)
            sendMutualTransactionEmbed(discordClient, baseBalances, traderAddress, transactionHash, kosettoInfo, twitterInfo, kosettoHolderInfo)
        }
        switch (true) {
            case firstBuyCondition: // If ethAmount is 0 and isBuy is true, it was someones first buy/account creation.
                handleFirstBuy(discordClient, baseBalances, traderAddress, transactionHash, kosettoInfo, twitterInfo, kosettoHolderInfo, taskHandler);
                break;
            case selfBuyCondition: // True if someone is buying their own key and its not the first buy.
                handleSelfBuy(discordClient, baseBalances, traderAddress, transactionHash, keyAmount, kosettoInfo, twitterInfo, kosettoHolderInfo);
                break;
            case selfSellCondition: // True if someone is selling their own key and its not the last key.
                handleSelfSell(discordClient, baseBalances, traderAddress, transactionHash, keyAmount, kosettoInfo, twitterInfo, kosettoHolderInfo);
                break;
            case shadyOrBillionaireBuyCondition: // True if a Shady Key was bought
                sendSalesEmbed(discordClient, traderAddress, keyAddress, keyAmount, parseFloat(ethers.utils.formatUnits(ethAmount.toString(), `ether`)).toPrecision(3), transactionHash);
                break;
            default:
            console.log(`No embeds to send.`);
                return;
        }
    }
}

async function handleFirstBuy(discordClient, baseBalances, traderAddress, transactionHash, kosettoInfo, twitterInfo, kosettoHolderInfo, taskHandler) { // Handles self buy transactions.
    console.log(`@${kosettoInfo.twitterHandle} bought their first share at tx ${transactionHash}.`);
    sendFirstBuyEmbed(discordClient, baseBalances, traderAddress, transactionHash, kosettoInfo, twitterInfo, kosettoHolderInfo); // Sends the first buy embed.
    taskHandler.snipeAddressCheck(discordClient, traderAddress);
    return;
}

async function handleSelfBuy(discordClient, baseBalances, traderAddress, transactionHash, keyAmount, kosettoAddressInfo, twitterInfo, kosettoHolderInfo) { // Handles self buy transactions.
    console.log(`@${kosettoAddressInfo.twitterHandle} bought their own share at tx ${transactionHash}`);
    sendSelfBuyEmbed(discordClient, baseBalances, traderAddress, transactionHash, keyAmount, kosettoAddressInfo, twitterInfo, kosettoHolderInfo); // Sending the self buy transaction embed.
    return;
}

async function handleSelfSell(discordClient, baseBalances, traderAddress, transactionHash, keysSold, kosettoAddressInfo, twitterInfo, kosettoHolderInfo) {
    console.log(`@${kosettoAddressInfo.twitterHandle} sold their own share at tx ${transactionHash}`);
    sendSelfSellEmbed(discordClient, baseBalances, traderAddress, transactionHash, keysSold, kosettoAddressInfo, twitterInfo, kosettoHolderInfo); // Sending the self buy transaction.
    return;
}

// Handles bridge txs
async function handleBridgeTx(discordClient, receivingAddress, ethBridged, transactionHash) {
    let kosettoAddressInfo = await kosettoAddressCall(receivingAddress);
    if (kosettoAddressInfo.registered == false) { // Ends execution if the address isn't registered.
        console.log(`Unable to get info for ${receivingAddress}`);
        return;
    }
    console.log(`@${kosettoAddressInfo.twitterHandle} is bridging to base to the wallet ${receivingAddress}`);
    let twitterInfo = await getTwitterInfo(kosettoAddressInfo.twitterHandle);
    if (twitterInfo == null) { // Ends execution if twitter info wasn't able to be fetched.
        console.log(`Couldn't find twitter for ${kosettoAddressInfo.twitterHandle}.`);
        return;
    }
    let kosettoHolderInfo = await kosettoHoldersCall(receivingAddress);
    if (kosettoHolderInfo == null) { // Ends execution if twitter info wasn't able to be fetched.
        console.log(`Unable to get holderInfo for ${receivingAddress}.`);
        return;
    }
    let baseBalances = await ethersInteractions.getBaseBalancesForHolders(receivingAddress, kosettoHolderInfo); // Getting the base balance.
    if (baseBalances == null) { // Ends execution if the base balances of holders for wasn't able to be fetched.
        console.log(`Unable to get baseBalances of the holders of  for ${receivingAddress}.`);
        return;
    }
    sendBridgeTransactionEmbed(discordClient, receivingAddress, ethBridged, transactionHash, kosettoAddressInfo, twitterInfo, kosettoHolderInfo, baseBalances);
}

module.exports = { handleFriendTechEvents, handleBridgeTx };