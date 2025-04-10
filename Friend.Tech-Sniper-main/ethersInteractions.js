// This file is meant to add a sort of "wrapper" to promises that use ethers to prevent RPC related crashes i.e. 502 or 504.
const ethers = require(`ethers`);

var ethersInteractions = {};

const baseProvider = new ethers.providers.JsonRpcProvider(process.env.BASE_RPC_URL);

const BALANCE_CHECKER_CONTRACT = `0x8cd6740d42509f09076c50eb3e7f45ab3fce6f6c`;
const BalanceCheckerABI = require("./abi/BalanceCheckerABI.json");
const balanceCheckerContract = new ethers.Contract(BALANCE_CHECKER_CONTRACT, BalanceCheckerABI, baseProvider);

const FRIEND_TECH_ADDRESS = `0xcf205808ed36593aa40a44f10c7f7c2f67d4a4d4`;
const friendTechContractABI = require(`./abi/friendTechABI.json`);
const FRIEND_TECH_CONTRACT = new ethers.Contract(FRIEND_TECH_ADDRESS, friendTechContractABI, baseProvider);

const RETRY_DELAY = 300; // Waiting 300ms before retrying the RPC call.

ethersInteractions.getBlockWithTransactionsW = async function (provider, blockNumber) {
    try {
        const block = await provider.getBlockWithTransactions(blockNumber); // Getting all block information
        return block;
    } catch (error) {
        switch (error.status) {
            case 502 || 504:// 504 is gateway timeout
                setTimeout(() => { // Waiting RETRY_DELAY before trying the call again.
                    console.log(`RETRYING!!`)
                    return ethersInteractions.getBlockWithTransactionsW(provider, blockNumber);
                }, RETRY_DELAY);
                break;
            default:
                console.log(`RPC Crashed that isn't error 502 or 504.`);
                return null; // Returns null if it couldn't be grabbed.
        }
    }
}

ethersInteractions.getTransactionReceiptW = async function (provider, transactionHash) {
    try {
        const txReceipt = await provider.getTransactionReceipt(transactionHash); // Getting the transaction receipt from the blockchain.
        return txReceipt;
    } catch (error) {
        switch (error.status) {
            case 502 || 504:// 504 is gateway timeout
                setTimeout(() => { // Waiting RETRY_DELAY before trying the call again.
                    console.log(`RETRYING!!`)
                    return ethersInteractions.getTransactionReceiptW(provider, transactionHash);
                }, RETRY_DELAY);
                break;
            default:
                console.log(`RPC Crashed that isn't error 502 or 504.`);
                return null; // Returns null if it couldn't be grabbed.
        }
    }
}

ethersInteractions.getBalance = async function (provider, walletAddress) { // Getting the balance of a wallet, provider must be of desired network.
    try {
        let balance = await provider.getBalance(walletAddress);
        balance = ethers.utils.formatUnits(balance, `ether`); // Converting wei to Ether
        return parseFloat(balance).toPrecision(3);
    } catch (error) {
        console.log(`Error getting balance for ${walletAddress}.`);
        console.log(error)
        return null;
    }
}

ethersInteractions.getKeyBalance = async function (FRIEND_TECH_CONTRACT, walletAddress1, walletAddress2) { // Gets how many shares walletAddress1 has of walletAddress2.
    try {
        let keyBalance = await FRIEND_TECH_CONTRACT.sharesBalance(walletAddress1, walletAddress2); // Getting the shares balance.
        return keyBalance;
    } catch (error) {
        console.log(`Error getting keyBalance of ${walletAddress1} for ${walletAddress2}.`);
        return null;
    }
}

ethersInteractions.getBaseBalancesForHolders = async function (traderAddress, kosettoHolderInfo) { // Used for getting the balances for embeds.
    try {
        let balanceArray = await balanceCheckerContract.balances([traderAddress, ...kosettoHolderInfo.map(holder => holder.address)], ['0x0000000000000000000000000000000000000000']); // Getting key prices.
        balanceArray = balanceArray.map(bigNumber => parseFloat(ethers.utils.formatUnits(bigNumber, 'ether')).toPrecision(2));
        return balanceArray;
    } catch (error) {
        console.log(`Error getting balanceArray of the holders of KosettoHolderInfo.`);
        console.log(error)
        return null;
    }
}

ethersInteractions.is33ing = async function (traderAddress, keyAddress) {
    try {
        let traderKeysOwnedBySubject = await FRIEND_TECH_CONTRACT.sharesBalance(traderAddress, keyAddress); // Getting the amount of trade keys owned by subject from contract
        if (traderKeysOwnedBySubject > 0) {
            console.log(`keyAddress: ${keyAddress} owns keys of traderAddress: ${traderAddress} (is 33ing)`);
            return true; // Returns true if the subject owns keys from the trader.
        } else {
            return false; // Returns false if the subject doesn't own any trader keys.
        }
    } catch (error) {
        console.log(`HAD AN ERROR CHECKING IF 33`);
        console.log(error);
        return false;
    }
}

module.exports = ethersInteractions;