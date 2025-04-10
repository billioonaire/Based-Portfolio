const ethers = require('ethers');
const { sendFailedSnipesEmbed } = require(`./embedCreator.js`);
const ethersInteractions = require(`./ethersInteractions.js`);
const friendTechABI = require("./abi/friendTechABI.json");
const { handleFriendTechEvents, handleBridgeTx } = require('./eventHandler.js');

// RPC Providers
const BASE_PROVIDER = new ethers.providers.JsonRpcProvider("https://base-mainnet.g.alchemy.com/v2/3jvxo1TC_IJ28e-SmuOULOlJJtzF6hCL");
const mainnetProvider = new ethers.providers.JsonRpcProvider("https://mainnet.infura.io/v3/f823ce4ae5d242bdb27477b7e86fd7f0");

// Contract Constants
const FRIEND_TECH_ADDRESS = "0xcf205808ed36593aa40a44f10c7f7c2f67d4a4d4";
const BASE_DEPOSIT_CONTRACT = "0x3154cf16ccdb4c6d922629664174b904d80f2c35";

// Contract Objects
const FRIEND_TECH_CONTRACT = new ethers.Contract(FRIEND_TECH_ADDRESS, friendTechABI, BASE_PROVIDER);

async function startMonitors(discordClient, taskHandler) {
    mainnetProvider.on('block', async (blockNumber) => { // Listen for new blocks on Ethereum Mainnet
        console.log(`New Ethereum block number: ${blockNumber}`);
        const block = await ethersInteractions.getBlockWithTransactionsW(mainnetProvider, blockNumber); // Getting all block information
        if (block == null) return null;
        for (const tx of block.transactions) { // Iterating through all transactions.
            if (tx.to == null) continue; // Handles cases where a contract is being deployed
            if (tx.to.toLowerCase() == BASE_DEPOSIT_CONTRACT && tx.data.startsWith(`0x9a2ac6d5`)) { // If the tx is a depositTo using the base bridge.
                let receivingAddress = `0x` + tx.data.substring(34, 74).toLowerCase();
                handleBridgeTx(discordClient, receivingAddress, ethers.utils.formatUnits(tx.value, `ether`), tx.hash);
            }
        }
    });

    BASE_PROVIDER.on('block', async (blockNumber) => { // Listen for new blocks on Base
        console.log(`New Base block number: ${blockNumber}`);
        const block = await ethersInteractions.getBlockWithTransactionsW(BASE_PROVIDER, blockNumber); // Getting all block information
        if (!block || !block.transactions) return null;
        const snipedAddresses = {};
        const receiptPromises = []; // Creating the array to store promises for the promise.all.
        for (const tx of block.transactions) {
            if (tx.to == null) continue;
            if (tx.to.toLowerCase() == FRIEND_TECH_ADDRESS) {
                const receiptPromise = ethersInteractions.getTransactionReceiptW(BASE_PROVIDER, tx.hash) // Getting the txReceipt and adding it to snipedAddresses map
                    .then(receipt => {
                        if (receipt == null) return;
                        if (receipt.status == null) return;
                        if (receipt.status && receipt.status === 0 && tx.data.startsWith('0x6945b123')) {
                            const keyAddress = "0x" + tx.data.substring(34, 74);
                            const sniperAddress = tx.from;
                            if (!snipedAddresses[keyAddress]) {
                                snipedAddresses[keyAddress] = {
                                    snipedAddress: keyAddress,
                                    totalSnipes: 0,
                                    sniperObjects: {},
                                };
                            }
                            snipedAddresses[keyAddress].totalSnipes++;
                            if (snipedAddresses[keyAddress].sniperObjects[sniperAddress]) {
                                snipedAddresses[keyAddress].sniperObjects[sniperAddress]++;
                            } else {
                                snipedAddresses[keyAddress].sniperObjects[sniperAddress] = 1;
                            }
                        }
                    });
                receiptPromises.push(receiptPromise); // Adding the tx receipt + processing to the promise.all array.
            }
        }
        await Promise.all(receiptPromises); // Waiting for all promises to be resolved.

        const filteredSnipedAddresses = Object.values(snipedAddresses).filter( // Filter snipedAddresses to exclude those with only 1 totalsnipes
            (address) => address.totalSnipes > 1
        );
        if (filteredSnipedAddresses.length > 0) { // Sending the sendFailedSnipesEmbed embed as long as there were failed snipes in that block, requires more than 1 sniper to show. 
            sendFailedSnipesEmbed(discordClient, blockNumber, filteredSnipedAddresses);
        }
    });

    let transactionHash = ``; // Saving the transaction hash as an empty string.
    let trader, keyAddress, isBuy;
    let ethAmount = 0; // Initialising the ethAmount to being a number.
    let shareAmount = 0; // Initialising the shareAmount to being a number.
    let keySupply = 0; // Initialising the keySupply to being a number.
    FRIEND_TECH_CONTRACT.on('*', (event) => { // Listening to the friend.tech contract for events emitted.
        if (event.eventSignature != 'Trade(address,address,bool,uint256,uint256,uint256,uint256,uint256)') return; // Making sure the event is the right one.
        let eventArgs = event.args;
        if (transactionHash == event.transactionHash.toLowerCase() && transactionHash != ``) { // If the event is from the same transaction as before.
            ethAmount += Number(eventArgs.ethAmount) + Number(eventArgs.protocolEthAmount) + Number(eventArgs.subjectEthAmount); // Adding the ethAmount from that event
            shareAmount += Number(eventArgs.shareAmount); // Adding the shareAmount for that event.
            keySupply = Number(eventArgs.supply); // Setting the supply to the latest event in the transaction.
            trader = eventArgs.trader.toLowerCase();
            keyAddress = eventArgs.subject.toLowerCase();
        } else { // If its from a new transaction.

            //CONSOLE.LOG ALL SUCCESSGFUL BUYS IN THIS BLOCK ONLY

            if (transactionHash != ``) { // Sending the embed for the transaction.
                handleFriendTechEvents(discordClient, trader, keyAddress, shareAmount, keySupply, ethAmount, isBuy, transactionHash, taskHandler);
            }
            // Changing all variables for the new transaction
            trader = eventArgs.trader.toLowerCase();
            keyAddress = eventArgs.subject.toLowerCase();
            ethAmount = Number(eventArgs.ethAmount) + Number(eventArgs.protocolEthAmount) + Number(eventArgs.subjectEthAmount);
            shareAmount = Number(eventArgs.shareAmount);
            transactionHash = event.transactionHash.toLowerCase(); // If the event is from a new transaction.
            isBuy = eventArgs.isBuy;
            keySupply = Number(eventArgs.supply);
        }
    });
}

module.exports = { startMonitors };
