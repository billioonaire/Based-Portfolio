var taskHandler = {};

const { loadTasks, removeSpamTask, getTwitter } = require('./dataHandler.js');
const fs = require('fs');
const ethers = require('ethers');
const { transactionManager, sendSnipeTransaction } = require(`./transactionManager.js`)

const BALANCE_CHECKER_CONTRACT = `0x8cd6740d42509f09076c50eb3e7f45ab3fce6f6c`;
const BalanceCheckerABI = require("./abi/BalanceCheckerABI.json");
const baseProvider = new ethers.providers.JsonRpcProvider("https://base-mainnet.g.alchemy.com/v2/3jvxo1TC_IJ28e-SmuOULOlJJtzF6hCL");

const balanceCheckerContract = new ethers.Contract(BALANCE_CHECKER_CONTRACT, BalanceCheckerABI, baseProvider);

const twitterMap = {
    snipeTasks: [],
    spamTasks: []
};

let previousFileSize = null;
let previousFileModifiedTime = null;
const dataFilePath = './userData.json';

let addressMap = new Map();
let quickTasksMap = new Map();

let buffer1 = [];
let buffer2 = [];
let activeBuffer = buffer1;
function loadAndSort(filename) {
    const inactiveBuffer = (activeBuffer === buffer1) ? buffer2 : buffer1;

    const newData = fs.readFileSync(filename, 'utf8')
        .split('\n')
        .filter(line => line)  // Filter out any empty lines
        .map(line => {
            const [twitterHandle, address] = line.split(',');
            return { twitterHandle, address };
        })
        .sort((a, b) => a.address.localeCompare(b.address));

    inactiveBuffer.length = 0;  // Clear the inactive buffer
    for (let item of newData) {
        inactiveBuffer.push(item);
    }

    // Swap buffers
    activeBuffer = inactiveBuffer;
}

function binarySearch(data, targetAddress) {
    let low = 0, high = data.length - 1;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const address = data[mid].address;

        if (address === targetAddress) {
            return data[mid].twitterHandle;
        } else if (address < targetAddress) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }

    return null;
}

function reloadCSV() {
    //console.log("Reloading CSV...");
    loadAndSort('./newSignups.csv');
}

taskHandler.start = async function () {



    fs.stat(dataFilePath, async (err, stats) => {
        if (err) {
            console.error('Error reading file stats:', err);
            return;
        }

        const currentFileSize = stats.size;
        const currentFileModifiedTime = stats.mtime.getTime();

        if (previousFileSize !== currentFileSize || previousFileModifiedTime !== currentFileModifiedTime) {
            console.log('Tasks Loaded')
            // File has been modified or changed in size
            let tasks = await loadTasks();

            twitterMap.snipeTasks = tasks.snipeTasks;
            twitterMap.spamTasks = tasks.spamTasks;
            previousFileSize = currentFileSize;
            previousFileModifiedTime = currentFileModifiedTime;
        }
    });

    reloadCSV();

};

taskHandler.addQuicktask = function(discordClient, startDelay, subjectAddress, sweepPrice, txPerSecond, duration, discord_id, identifier) {

    let twitterUsername = getTwitter(subjectAddress)

    const key = `${discord_id}-${subjectAddress}`;

    // Create the task object
    const task = {
        discordClient,
        startDelay,
        subjectAddress,
        sweepPrice,
        txPerSecond,
        duration,
        discord_id,
        identifier
    };

    // Set the task object in the Map, replacing any existing task with the same key
    quickTasksMap.set(key, task);
    addressMap.set(subjectAddress, twitterUsername);

}
// Assuming quickTaskMap is an object that you want to append methods to
function quickTaskCheck(discordClient, subjectAddress) {
    for (let [key, task] of quickTasksMap.entries()) {
        const [, currentSubjectAddress] = key.split('-');
        if (currentSubjectAddress === subjectAddress) {
            const { startDelay, sweepPrice, txPerSecond, duration, discord_id, identifier } = task;

            transactionManager.startSpamming(discordClient, startDelay, subjectAddress, sweepPrice, txPerSecond, duration, discord_id, identifier);
            
            console.log(`Found and executed task for address ${subjectAddress}: ${key}`);
            quickTasksMap.delete(key);
        }
    }
}

taskHandler.balanceCheckLoop = async function (discordClient) {
    setInterval(async function () {

        let tokens = ['0x0000000000000000000000000000000000000000'];
        let keysArray = Array.from(addressMap.keys());

        if (keysArray.length === 0) {
            console.log("The addressMap is empty.");
        } else {
            console.log(keysArray);
        }
        let balances = await balanceCheckerContract.balances(keysArray, tokens);

        for (let i = 0; i < balances.length; i++) {

            const balance = balances[i];
            const userAddress = keysArray[i]; // Assuming the balance index corresponds to the user's index

            if (balance.gt(0)) { // Using .gt method because balance is likely a BigNumber object
                console.log(`Address ${userAddress} has a balance of ${balance.toString()}`);
                spamAddressStart(discordClient, addressMap.get(userAddress), userAddress)
                quickTaskCheck(discordClient, userAddress)
                addressMap.delete(userAddress);
            }
        }


    }, 4000);
}

taskHandler.getSnipeTasks = function (twitterUsername) {
    return twitterMap.snipeTasks.filter(task => task.twitter === twitterUsername);
}

taskHandler.getSpamTasks = function (twitterUsername) {
    return twitterMap.spamTasks.filter(task => task.twitter === twitterUsername);
}

taskHandler.stopSpamTasks = async function (discordID, snipeAddress) {
    await transactionManager.stopSpamming(discordID, snipeAddress);
}

taskHandler.addTime = async function (discordID, snipeAddress, timeInSeconds) {
    await transactionManager.addTime(discordID, snipeAddress, timeInSeconds);
}

taskHandler.snipeAddressCheck = function (discordClient, subjectAddress) {

    const twitterUsername = binarySearch(activeBuffer, subjectAddress);

    if (!twitterUsername) {
        return console.log(`No Twitter handle found for address ${subjectAddress}.`);

    } else {
        console.log(`The Twitter handle for address ${subjectAddress} is ${twitterUsername}.`);
    }


    const tasks = taskHandler.getSnipeTasks(twitterUsername);
    if (tasks.length > 0) {
        for (let i = 0; i < tasks.length; i++) {
            console.log(`Address for ${twitterUsername}: ${tasks[i]}`);

            let identifier = tasks[i].identifier;
            let sweepPrice = tasks[i].sweepPrice;
            let discord_id = tasks[i].discord_id;
            let prio = tasks[i].prio;


            console.log('%cSENDING SNIPE TRANSACTION', 'color: green');

            sendSnipeTransaction(discordClient, discord_id, identifier, sweepPrice, subjectAddress, prio, twitterUsername)
            //WILL BE EXECUTING HERE!!! ( HAVE ALL THE INGREDIENTS)

        }
    } else {
        console.log(`No users are sniping ${twitterUsername}`);
    }

}

taskHandler.spamAddressCheck = function (twitterUsername, subjectAddress) {
    const spamAddresses = taskHandler.getSpamTasks(twitterUsername);

    console.log(spamAddresses) // remove later

    if (spamAddresses.length > 0) {

        console.log(`Watching ${twitterUsername} for eth deposit on ${subjectAddress}`);

        addressMap.set(subjectAddress, twitterUsername);


    } else {
        console.log(`No Spam addresses found for ${twitterUsername}`);
    }
}

spamAddressStart = function (discordClient, twitterUsername, subjectAddress) {
    const tasks = taskHandler.getSpamTasks(twitterUsername);

    if (tasks.length > 0) {


        for (let i = 0; i < tasks.length; i++) {

            let identifier = tasks[i].identifier;
            let sweepPrice = tasks[i].sweepPrice;
            let discord_id = tasks[i].discord_id;
            let txPerSecond = tasks[i].txPerSecond;
            let startDelay = tasks[i].startDelay
            let duration = tasks[i].duration

            transactionManager.startSpamming(discordClient, startDelay, subjectAddress, sweepPrice, txPerSecond, duration, discord_id, identifier); // Starts spamming the task.
            removeSpamTask(discord_id, `discord`, twitterUsername); // Removing the spam task after spamming starts.

        }

    } else {
        console.log(`No Spam addresses found for ${twitterUsername}`);
    }
}


taskHandler.handleFirstBuy = async function (walletAddress) { // calls getInfo and then sends the self buy embed and does whatever the fuck with the task.

    console.log("TESTINGTESTINGTESTINGTESTING")



    this.snipeAddressCheck(foundTwitterHandle, walletAddress)

}

module.exports = taskHandler;