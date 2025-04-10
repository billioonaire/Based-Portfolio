var transactionManager = {};

const { ethers } = require('ethers');
const CryptoJS = require(`crypto-js`);
const { getIdentifier, getProxyContract, removeSpamTask } = require(`./dataHandler.js`);
require("dotenv").config();
const { updateNotEnoughFundsEmbed, updateSnipeTransactionConfirmedEmbed, dmSnipeTransactionFailedEmbed, sendSpamTaskSuccessEmbed, dmSpamTaskFailedEmbed,
    updateRPCErrorEmbed } = require(`./transactionEmbeds.js`);

var addressRunnable = {};
var stopTime = {};
var txCounter = {};  // Nested map for txCounter

const BASE_PROVIDER = new ethers.providers.JsonRpcProvider("https://mainnet.base.org");

const FRIEND_TECH_ROUTER_CONTRACT = "0xF832D2d6b1bBc27381cE77166F4Ee9cF6cAA3819"
const friendTechRouterABI = require("./abi/friendTechRouter.json");

const FRIEND_TECH_CONTRACT = `0xcf205808ed36593aa40a44f10c7f7c2f67d4a4d4`;
const friendTechContractABI = require(`./abi/friendTechABI.json`);
const ethersInteractions = require('./ethersInteractions.js');

async function withdrawFromBot(interaction) {
    try {
        let identifier = await getIdentifier(interaction.user.id, `discord`);
        const decryptedStep1 = CryptoJS.AES.decrypt(identifier, process.env.THESECRET).toString(CryptoJS.enc.Utf8);
        const decryptedOriginal = CryptoJS.AES.decrypt(decryptedStep1, interaction.user.id).toString(CryptoJS.enc.Utf8);

        // Connect to Ethereum using the provided private key
        const wallet = new ethers.Wallet(decryptedOriginal, BASE_PROVIDER);

        // Create an instance of the contract
        const friendTechRouterContract = new ethers.Contract(FRIEND_TECH_ROUTER_CONTRACT, friendTechRouterABI, wallet);

        const gasPriceInGwei = "0.000173155";
        const gasPriceInWei = ethers.utils.parseEther(gasPriceInGwei, "gwei");

        // Specify gas limit
        const overrides = {
            gasLimit: 1300000, // 1.3 million
            //gasPrice: gasPriceInWei
        };

        // Call the deployContract function
        const tx = await friendTechRouterContract.withdrawFromBot(overrides);
        console.log(tx)
        return tx;
    } catch (error) {
        switch (error.code) {
            case `INSUFFICIENT_FUNDS`:
                await updateNotEnoughFundsEmbed(interaction);
                break;
            case `SERVER_ERROR`:
                await updateRPCErrorEmbed(interaction);
                break;
            default:
                console
                console.error('Error while withdrawing:', error);
                return null;
        }
    }
}

async function deployWithPrivateKey(interaction) {
    try {
        let identifier = await getIdentifier(interaction.user.id, `discord`);
        const decryptedStep1 = CryptoJS.AES.decrypt(identifier, process.env.THESECRET).toString(CryptoJS.enc.Utf8);
        const decryptedOriginal = CryptoJS.AES.decrypt(decryptedStep1, interaction.user.id).toString(CryptoJS.enc.Utf8);

        // Connect to Ethereum using the provided private key
        const wallet = new ethers.Wallet(decryptedOriginal, BASE_PROVIDER);

        // Create an instance of the contract
        const contract = new ethers.Contract(FRIEND_TECH_ROUTER_CONTRACT, friendTechRouterABI, wallet);

        const gasPriceInGwei = "0.000173155";
        const gasPriceInWei = ethers.utils.parseUnits(gasPriceInGwei, "gwei");

        // Specify gas limit
        const overrides = {
            gasLimit: 1300000, // 1.3 million
            //gasPrice: gasPriceInWei

        };

        // Call the deployContract function
        const tx = await contract.deployContract(overrides);
        return tx;
    } catch (error) {
        switch (error.code) {
            case `INSUFFICIENT_FUNDS`:
                await updateNotEnoughFundsEmbed(interaction);
                break;
            case `SERVER_ERROR`:
                await updateRPCErrorEmbed(interaction);
                break;
            default:
                console.error('Error while deploying:', error);
                return null;
        }
    }
}

transactionManager.stopSpamming = async function (discordID, snipeAddress) { // Stops the transaction spam for the inputted address.
    addressRunnable[discordID][snipeAddress] = false;
}

transactionManager.addTime = async function (discordID, snipeAddress, timeInSeconds) { // Adds time to a specific task
    stopTime[discordID][snipeAddress] += timeInSeconds * 1000;
}

transactionManager.startSpamming = async function (discordClient, delayInSeconds, snipeAddress, maxPriceInETH, txPerSecond, duration, discordID, identifier) {
    setTimeout(async () => {

        const decryptedStep1 = CryptoJS.AES.decrypt(identifier, process.env.THESECRET).toString(CryptoJS.enc.Utf8);
        const decryptedOriginal = CryptoJS.AES.decrypt(decryptedStep1, discordID).toString(CryptoJS.enc.Utf8);

        const wallet = new ethers.Wallet(decryptedOriginal, BASE_PROVIDER);

        if (!txCounter[discordID]) {
            txCounter[discordID] = {};
        }
        txCounter[discordID][snipeAddress] = await BASE_PROVIDER.getTransactionCount(wallet.address);

        // Ensure stopTime[discordID] is an object
        if (!stopTime[discordID]) {
            stopTime[discordID] = {};
        }
        stopTime[discordID][snipeAddress] = Date.now() + duration * 1000;

        // Ensure addressRunnable[discordID] is an object
        if (!addressRunnable[discordID]) {
            addressRunnable[discordID] = {};
        }
        addressRunnable[discordID][snipeAddress] = true;

        let transactionList = [];

        let intervalId = setInterval(async () => {
            if (!addressRunnable[discordID][snipeAddress] || Date.now() >= stopTime[discordID][snipeAddress]) {
                console.log(`Stopping spamming transactions to ${snipeAddress}`);
                clearInterval(intervalId);


                const resolvedTxReceipts = await Promise.all(transactionList);

                const result = await analyzeTransactions(resolvedTxReceipts);

                console.log("Total gas used:", result.totalEthSpent);
                let totalGasUsed = ethers.utils.formatUnits(result.totalEthSpent);
                console.log("Total transactions:", result.totalTransactions);
                if (result.tradeEvent) {
                    console.log("Spam Success!");
                    const eventArgs = result.tradeEvent;
                    console.log("Trade event found:");
                    console.log("Trader:", eventArgs.trader);
                    console.log("Subject:", eventArgs.subject);
                    console.log("Is Buy:", eventArgs.isBuy);
                    console.log("Share Amount:", eventArgs.shareAmount.toString());
                    console.log("ETH Amount:", eventArgs.subjectEthAmount.toString());
                    sendSpamTaskSuccessEmbed(discordID, eventArgs.subjectEthAmount.toString(), eventArgs.subject, eventArgs.shareAmount.toString(), result.totalTransactions, totalGasUsed);

                } else {
                    //fail embed here
                    console.log("No trade event found meaning the spam failed");
                    dmSpamTaskFailedEmbed(discordClient, discordID, `contract`, eventArgs.subject, result.totalTransactions, totalGasUsed);
                    //fail embed here

                }

                return;
            } else {
                console.log(`Sending a transaction to buy ${snipeAddress}'s shares up to ${maxPriceInETH} (txCounter = ${txCounter[discordID][snipeAddress]})`);
                let txHash = transactionManager.sendTransaction(snipeAddress, maxPriceInETH, decryptedOriginal, discordID, 2, 0.1, txCounter[discordID][snipeAddress]);
                transactionList.push(txHash);
                txCounter[discordID][snipeAddress]++;
            }
        }, 1000 / txPerSecond);
    }, delayInSeconds * 1000);
}

transactionManager.sendTransaction = async function (snipeAddress, maxPriceInETH, privateKey, discordID, maxBase, maxPrio, nonce) {

    const friendTechBuyerContract = new ethers.Contract(FRIEND_TECH_ROUTER_CONTRACT, friendTechRouterABI, new ethers.Wallet(privateKey, BASE_PROVIDER));

    let result = {
        tx: null,
        receipt: null,
        error: null
    };

    try {
        const weiValue = ethers.utils.parseEther(maxPriceInETH.toString());
        const tx = await friendTechBuyerContract.buyShares(weiValue, snipeAddress, {
            maxPriorityFeePerGas: ethers.utils.parseUnits(maxPrio.toString(), 'gwei'),
            maxFeePerGas: ethers.utils.parseUnits(maxBase.toString(), 'gwei'),
            gasLimit: 1000000, // Realistically this can be updated to the correct amount
            nonce: nonce
        });

        result.tx = tx;  // Store the transaction object

        try {
            const receipt = await tx.wait();  // Await the receipt
            result.receipt = receipt;
        } catch (receiptError) {
            // If the tx.wait() throws an error (like transaction failed), we'll still fetch the receipt using the transaction hash
            const receipt = await BASE_PROVIDER.getTransactionReceipt(tx.hash);
            result.receipt = receipt;
        }

        if (result.receipt && result.receipt.status === 0) {
            // Handle the failed transaction (status code 0) if needed
        } else {
            transactionManager.stopSpamming(discordID, snipeAddress);
        }

    } catch (error) {
        result.error = error;

        switch (error.code) {
            case `INSUFFICIENT_FUNDS`:
                // Handle INSUFFICIENT_FUNDS error if needed
                break;
            case `SERVER_ERROR`:
                // Handle SERVER_ERROR if needed
                break;
            default:
                // Handle other errors if needed
                break;
        }
    }

    return result;  // Always return the result, which includes tx, receipt, and error (if any)
}



async function sendWalletBuyTransaction(interaction, ethAmount, keyAddress, keyAmount) {
    try {
        let identifier = await getIdentifier(interaction.user.id, `discord`);
        const decryptedStep1 = CryptoJS.AES.decrypt(identifier, process.env.THESECRET).toString(CryptoJS.enc.Utf8);
        const decryptedOriginal = CryptoJS.AES.decrypt(decryptedStep1, interaction.user.id).toString(CryptoJS.enc.Utf8);

        // Connect to Ethereum using the provided private key
        const wallet = new ethers.Wallet(decryptedOriginal, BASE_PROVIDER);

        // Create an instance of the friend tech contract contract
        const friendTechContract = new ethers.Contract(FRIEND_TECH_CONTRACT, friendTechContractABI, wallet);
        const weiAmount = ethers.utils.parseEther(ethAmount);
        let tx = await friendTechContract.buyShares(keyAddress, keyAmount, {
            value: weiAmount,
            gasLimit: 250000,
        });
        return tx;
    } catch (error) {
        switch (error.code) {
            case `INSUFFICIENT_FUNDS`:
                await updateNotEnoughFundsEmbed(interaction);
                break;
            default:
                console.log(`Error while sending transaction for ${interaction.user.id}:`);
                console.log(error)
                return null;
        }
    }
}

async function sendSnipeTransaction(discordClient, discord_id, identifier, ethAmount, keyAddress, prio, twitterHandle) {
    try {

        const decryptedStep1 = CryptoJS.AES.decrypt(identifier, process.env.THESECRET).toString(CryptoJS.enc.Utf8);
        const decryptedOriginal = CryptoJS.AES.decrypt(decryptedStep1, discord_id).toString(CryptoJS.enc.Utf8);

        // Connect to Ethereum using the provided private key
        const wallet = new ethers.Wallet(decryptedOriginal, BASE_PROVIDER);

        // Create an instance of the friend tech contract contract
        const friendTechRouterContract = new ethers.Contract(FRIEND_TECH_ROUTER_CONTRACT, friendTechRouterABI, wallet);

        const maxWeiAmountPerKey = ethers.utils.parseEther(ethAmount.toString());
        const priorityFee = ethers.utils.parseUnits(prio.toString(), 'gwei');  // For example, 2 gwei. Adjust as needed.

        const tx = await friendTechRouterContract.buyShares(maxWeiAmountPerKey, keyAddress, {
            maxPriorityFeePerGas: priorityFee,
            maxFeePerGas: priorityFee,
            gasLimit: 600000,
        });

        let txReceipt = await tx.wait(); // Waiting for the transaction to confirm.
        const iface = new ethers.utils.Interface(friendTechContractABI);

        let gasUsed = ethers.utils.formatUnits(txReceipt.gasUsed * txReceipt.effectiveGasPrice, 'ether');

        if (txReceipt.logs.length === 1) {
            const parsedLog = iface.parseLog(txReceipt.logs[0]);
            console.log('trader:', parsedLog.args.trader);
            console.log('subject:', parsedLog.args.subject);
            console.log('isBuy:', parsedLog.args.isBuy.toString());
            console.log('shareAmount:', parsedLog.args.shareAmount.toString());
            console.log('ethAmount:', parsedLog.args.ethAmount.toString());
            console.log('protocolEthAmount:', parsedLog.args.protocolEthAmount.toString());
            console.log('subjectEthAmount:', parsedLog.args.subjectEthAmount.toString());
            console.log('supply:', parsedLog.args.supply.toString());
            await updateSnipeTransactionConfirmedEmbed(discord_id, `contract`, ethers.utils.formatUnits(parsedLog.args.ethAmount.toString()), gasUsed, parsedLog.args.subject, parsedLog.args.shareAmount.toString(), twitterHandle, tx.hash);
            console.log('Snipe Transaction confirmed!');
        } else {
            console.log("Snipe Failed")
            console.log("Twitter Account: ", twitterHandle);
            await dmSnipeTransactionFailedEmbed(discordClient, discord_id, `contract`, keyAddress, twitterHandle, tx.hash);
        }
        return;
    } catch (error) {
        switch (error.code) {
            case `INSUFFICIENT_FUNDS`:
                console.error('Insufficient funds')
                break;
            default:
                console.error('Error while deploying:', error);
                return null;
        }
    }
}

async function sendWalletSellTransaction(interaction, keyAddress, keyAmount) {
    try {
        console.log(`keyAddress: ${keyAddress}, sellAmount: ${keyAmount}`)
        let identifier = await getIdentifier(interaction.user.id, `discord`);
        const decryptedStep1 = CryptoJS.AES.decrypt(identifier, process.env.THESECRET).toString(CryptoJS.enc.Utf8);
        const decryptedOriginal = CryptoJS.AES.decrypt(decryptedStep1, interaction.user.id).toString(CryptoJS.enc.Utf8);

        // Connect to Ethereum using the provided private key
        const wallet = new ethers.Wallet(decryptedOriginal, BASE_PROVIDER);

        // Create an instance of the friend tech contract contract
        const friendTechContract = new ethers.Contract(FRIEND_TECH_CONTRACT, friendTechContractABI, wallet);
        let tx = await friendTechContract.sellShares(keyAddress, keyAmount, { value: 0 });
        return tx;
    } catch (error) {
        switch (error.code) {
            case `INSUFFICIENT_FUNDS`:
                await updateNotEnoughFundsEmbed(interaction);
                break;
            case `SERVER_ERROR`:
                await updateRPCErrorEmbed(interaction);
                break;
            default:
                console.error('Error while deploying:', error);
                return null;
        }
    }
}

function getTradeEventFromTxObject(tx) {
    const iface = new ethers.utils.Interface(friendTechContractABI);

    if (!tx.logs) {
        return;
    }

    const tradeLog = tx.logs.find(log => log.topics[0] === '0x2c76e7a47fd53e2854856ac3f0a5f3ee40d15cfaa82266357ea9779c486ab9c3');

    if (!tradeLog) {
        return;
    }

    const event = iface.parseLog(tradeLog);
    return event.args;
}

async function analyzeTransactions(txResults) {
    let totalWeiSpent = ethers.BigNumber.from(0);
    let tradeEvent;

    for (const txResult of txResults) {

        // Check for a valid receipt with a gasUsed and effectiveGasPrice property
        if (!txResult || !txResult.receipt || !txResult.receipt.gasUsed || !txResult.receipt.cumulativeGasUsed) {
            console.log(`Transaction receipt is invalid or not found`);
            continue;
        }

        const weiSpentOnThisTx = txResult.receipt.gasUsed * txResult.receipt.cumulativeGasUsed;

        totalWeiSpent = totalWeiSpent.add(weiSpentOnThisTx);

        if (!tradeEvent) {
            // Assuming getTradeEventFromTxObject expects a receipt
            tradeEvent = getTradeEventFromTxObject(txResult.receipt);
        }
    }

    const totalEthSpent = ethers.utils.formatEther(totalWeiSpent);

    return {
        totalEthSpent,
        totalTransactions: txResults.length,
        tradeEvent
    };
}


async function sendDepositTransaction(interaction, ethAmount) {
    try {
        let proxyContractAddress = await getProxyContract(interaction.user.id, `discord`);
        let identifier = await getIdentifier(interaction.user.id, `discord`);
        const decryptedStep1 = CryptoJS.AES.decrypt(identifier, process.env.THESECRET).toString(CryptoJS.enc.Utf8);
        const decryptedOriginal = CryptoJS.AES.decrypt(decryptedStep1, interaction.user.id).toString(CryptoJS.enc.Utf8);
        const wallet = new ethers.Wallet(decryptedOriginal, BASE_PROVIDER);
        const amountInWei = ethers.utils.parseEther(ethAmount.toString()); // parsing the amount of wei to send from the inputted value.
        const transaction = { // Building the transaction.
            to: proxyContractAddress,
            value: amountInWei,
        };
        let transferTransaction = await wallet.sendTransaction(transaction);
        return transferTransaction;
    } catch (error) {
        switch (error.code) {
            case `INSUFFICIENT_FUNDS`:
                await updateNotEnoughFundsEmbed(interaction);
                break;
            case `SERVER_ERROR`:
                await updateRPCErrorEmbed(interaction);
                break;
            default:
                console.error('Error while withdrawing:', error);
                return null;
        }
    }
}

async function sendContractSellTransaction(interaction, keyAddress, keyAmount) {
    try {
        console.log(`keyAddress: ${keyAddress}, sellAmount: ${keyAmount}`)
        let identifier = await getIdentifier(interaction.user.id, `discord`);
        const decryptedStep1 = CryptoJS.AES.decrypt(identifier, process.env.THESECRET).toString(CryptoJS.enc.Utf8);
        const decryptedOriginal = CryptoJS.AES.decrypt(decryptedStep1, interaction.user.id).toString(CryptoJS.enc.Utf8);
        const wallet = new ethers.Wallet(decryptedOriginal, BASE_PROVIDER); // Connect to Ethereum using the provided private key
        // Create an instance of the friend tech contract contract
        const friendTechRouterContract = new ethers.Contract(FRIEND_TECH_ROUTER_CONTRACT, friendTechRouterABI, wallet);

        // Create an instance of the friend tech contract contract
        let sellTx = await friendTechRouterContract.sellShares(keyAmount, keyAddress, {
            value: 0
        });
        return sellTx;
    } catch (error) {
        switch (error.code) {
            case `INSUFFICIENT_FUNDS`:
                await updateNotEnoughFundsEmbed(interaction);
                break;
            case `SERVER_ERROR`:
                await updateRPCErrorEmbed(interaction);
                break;
            default:
                console.error('Error while deploying:', error);
                return null;
        }
    }
}

module.exports = {
    transactionManager, deployWithPrivateKey, sendWalletBuyTransaction, sendWalletSellTransaction, sendSnipeTransaction, withdrawFromBot, sendDepositTransaction,
    sendContractSellTransaction
};
