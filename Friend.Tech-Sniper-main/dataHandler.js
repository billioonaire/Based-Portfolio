const fs = require('fs');
const dataFilePath = './userData.json';

async function loadTasks(){

    let snipeTasks = [];

    let spamTasks = [];

    userData = require(dataFilePath);

    userData.forEach(element => {

        if (element.snipeTasks && element.snipeTasks.length > 0) {
            element.snipeTasks.forEach(task => {
    
                snipeTasks.push({
                    twitter: task.twitter_handle,
                    identifier: element.identifier,
                    discord_id: element.discord_id,
                    sweepPrice: task.sweepPrice,
                    prio: task.prio
                });
    
            })

        }
        if (element.spamTasks && element.spamTasks.length > 0) {
            element.spamTasks.forEach(task => {
    
                spamTasks.push({
                twitter: task.twitter_handle,
                identifier: element.identifier,
                discord_id: element.discord_id,
                sweepPrice: task.sweepPrice,
                txPerSecond: element.spamSettings.txPerSecond,
                startDelay: element.spamSettings.startDelay,
                duration: element.spamSettings.duration,
                });
    
            })

        }


    });

    return {
        snipeTasks: snipeTasks,
        spamTasks: spamTasks
    }

}

async function getUser(userID, platform) {
    let user;
    let userData = [];

    try {
        if (fs.existsSync(dataFilePath)) {
            userData = require(dataFilePath);
        } else {
            fs.writeFileSync(dataFilePath, JSON.stringify(userData));
        }
    } catch (err) {
        console.error('Error handling userData.json:', err);
    }

    // Check if the user with the given platform and ID already exists
    if (platform === 'discord') {
        user = userData.find((userData) => userData.discord_id === userID);
    } else if (platform === 'telegram') {
        user = userData.find((userData) => userData.telegram_id === userID);
    }

    // If the user doesn't exist, create a new user object
    if (!user) {
        user = {
            discord_id: platform === 'discord' ? userID : '',
            telegram_id: platform === 'telegram' ? userID : '',
            walletAddress: '',
            identifier: '',
            proxyContract: '',
            spamSettings: {},
            snipeTasks: [],
            spamTasks: [],
        };
        userData.push(user);
        fs.writeFileSync(dataFilePath, JSON.stringify(userData, null, 2));
    }

    return user;
}

async function writeUserData(userID, platform, newUserData) {
    // Save the updated userData back to the JSON file
    const userData = require(dataFilePath);
    let userIndex;
    switch (platform) {
        case `discord`:
            userIndex = userData.findIndex(userData => userData.discord_id === userID);
            break;
        case `telegram`:
            userIndex = userData.findIndex(userData => userData.telegram_id === userID);
            break;
    }
    if (userIndex !== -1) {
        userData[userIndex] = newUserData;
        fs.writeFileSync(dataFilePath, JSON.stringify(userData, null, 2));
    }
}

async function addSnipeTask(userID, platform, twitterHandleInput, sweepPriceInput, prioInput) {
    try {
        let user = await getUser(userID, platform); // Getting the user data from the db or else putting the user in the db.
        const existingSnipeTask = user.snipeTasks.find((snipeTask) => snipeTask.twitter_handle.toLowerCase() === twitterHandleInput.toLowerCase()); // Checks if the snipe task was already created
        if (existingSnipeTask) { // If the snipeTask exists, update its properties
            let oldTask = { sweepPrice: existingSnipeTask.sweepPrice, prio: existingSnipeTask.prio };
            existingSnipeTask.sweepPrice = sweepPriceInput;
            existingSnipeTask.prio = prioInput;

            // Save the updated userData back to the JSON file
            writeUserData(userID, platform, user); // Call the writeUserData function

            return oldTask;
        } else { // If the snipeTask doesn't exist, create a new SnipeTask object and then push it to the user's snipeTasks array.
            const newSnipeTask = {
                twitter_handle: twitterHandleInput,
                sweepPrice: sweepPriceInput,
                prio: prioInput,
            };
            user.snipeTasks.push(newSnipeTask); // Add the new SnipeTask to the user's snipeTasks array

            // Save the updated userData back to the JSON file
            writeUserData(userID, platform, user); // Call the writeUserData function

            return false;
        }
    } catch (error) {
        console.error(`Error adding snipeTask for user ${userID}, twitter: ${twitterHandleInput}`, error);
        throw error;
    }
}

async function addSpamTask(userID, platform, twitterHandleInput, sweepPriceInput) {
    try {
        let user = await getUser(userID, platform); // Getting the user data from the db or else putting the user in the db.
        let existingSpamTask = user.spamTasks.find((spamTask) => spamTask.twitter_handle.toLowerCase() === twitterHandleInput.toLowerCase()); // Checks for an existing spam task by twitter name
        if (existingSpamTask) { // If the spamTask exists, update its properties
            let oldTask = { twitterHandle: existingSpamTask.twitter_handle, sweepPrice: existingSpamTask.sweepPrice };
            existingSpamTask.twitter_handle = twitterHandleInput;
            existingSpamTask.sweepPrice = sweepPriceInput;

            // Save the updated userData back to the JSON file
            writeUserData(userID, platform, user); // Call the writeUserData function

            return oldTask;
        } else { // If the spamTask doesn't exist, create a new SpamTask object and then push it to the user's spamTasks array.
            existingSpamTask = user.spamTasks.find((spamTask) => spamTask.twitter_handle.toLowerCase() === twitterHandleInput.toLowerCase()); // Checks for an existing spam task by handle
            if (existingSpamTask) {
                let oldTask = { twitterHandle: existingSpamTask.twitter_handle, sweepPrice: existingSpamTask.sweepPrice };
                existingSpamTask.twitter_handle = twitterHandleInput;
                existingSpamTask.sweepPrice = sweepPriceInput;

                // Save the updated userData back to the JSON file
                writeUserData(userID, platform, user); // Call the writeUserData function

                return oldTask;
            } else {
                const newSpamTask = {
                    twitter_handle: twitterHandleInput,
                    sweepPrice: sweepPriceInput,
                };
                user.spamTasks.push(newSpamTask); // Add the new SpamTask to the user's spamTasks array

                // Save the updated userData back to the JSON file
                writeUserData(userID, platform, user); // Call the writeUserData function

                return false;
            }
        }
    } catch (error) {
        console.error(`Error adding spam for user ${userID}, wallet_address: ${walletAddressInput}`, error);
        throw error;
    }
}

async function getSnipeTasks(userID, platform) {
    try {
        let user = await getUser(userID, platform); // Getting the user data from the db or else putting the user in the db.
        return user.snipeTasks; // Returning the snipeTasks array.
    } catch (error) {
        console.error(`Error getting user ${userID}'s snipe tasks.`, error);
        throw error;
    }
}

async function getSpamTasks(userID, platform) {
    try {
        let user = await getUser(userID, platform); // Getting the user data from the db or else putting the user in the db.
        return user.spamTasks; // Returning the spamTasks array.
    } catch (error) {
        console.error(`Error getting user ${userID}'s spam tasks.`, error);
        throw error;
    }
}

async function removeSpamTask(userID, platform, twitterHandleInput) {
    try {
        let user = await getUser(userID, platform); // Getting the user data from the db or else putting the user in the db.
        const indexOfSpamTask = user.spamTasks.findIndex((spamTask) => spamTask.twitter_handle.toLowerCase() === twitterHandleInput.toLowerCase());

        if (indexOfSpamTask !== -1) { // If the task is found in the user's spamTasks array
            let removedSpamTaskHandle = user.spamTasks[indexOfSpamTask].twitter_handle; // Storing the name so it can be returned.
            user.spamTasks.splice(indexOfSpamTask, 1); // Remove the spamTask

            // Save the updated userData back to the JSON file
            const userData = require(dataFilePath);
            const userIndex = userData.findIndex(userData => userData.discord_id === user.discord_id || userData.telegram_id === user.telegram_id);

            if (userIndex !== -1) {
                userData[userIndex] = user;
                fs.writeFileSync(dataFilePath, JSON.stringify(userData, null, 2));
            }

            return removedSpamTaskHandle; // Returning the removed spamTask name.
        } else { // If the task doesn't exist, return false.
            return false;
        }
    } catch (error) {
        console.error("Error removing the spam task:", error);
        throw error;
    }
}

async function getSpamSettings(userID, platform) {
    try {
        let user = await getUser(userID, platform); // Getting the user data from the db or else putting the user in the db.
        return user.spamSettings; // Returning the spamSettings.
    } catch (error) {
        console.error(`Error getting user ${userID}'s spamSettings.`, error);
        throw error;
    }
}

async function setSpamSettings(userID, platform, txPerSecondInput, startDelayInput, durationInput) {
    try {
        let user = await getUser(userID, platform); // Get the user object using the getUser function
        user.spamSettings = { // Update the spam settings for the user
            txPerSecond: txPerSecondInput,
            startDelay: startDelayInput,
            duration: durationInput,
        };

        // Save the updated userData back to the JSON file
        writeUserData(userID, platform, user); // Call the writeUserData function

        return user; // Returns the updated user object
    } catch (error) {
        console.error(`Error setting ${userID}'s spamSettings.`, error);
        throw error;
    }
}

async function getSpamTask(userID, platform, twitterHandleInput) {
    try {
        let user = await getUser(userID, platform); // Getting the user data from the db or else putting the user in the db.
        const spamTask = user.spamTasks.find((task) => task.twitter_handle.toLowerCase() === twitterHandleInput.toLowerCase()); // Checks if the spamTask exists and stores it in memory.
        if (spamTask) { // If the spam task exists, return its name.
            return spamTask;
        } else { // If the spam task doesn't exist, return false.
            return false;
        }
    } catch (error) {
        console.error(`Error getting the spam task for user ${userID}`, error);
        throw error;
    }
}

async function getSnipeTask(userID, platform, twitterHandleInput) {
    try {
        let user = await getUser(userID, platform); // Getting the user data from the db or else putting the user in the db.
        const snipeTask = user.snipeTasks.find((task) => task.twitter_handle.toLowerCase() === twitterHandleInput.toLowerCase()); // Checks if the snipeTask exists and stores it in memory.

        if (snipeTask) { // If the snipe task exists, return its name.
            return snipeTask;
        } else { // If the snipe task doesn't exist, return false.
            return false;
        }
    } catch (error) {
        console.error(`Error getting the snipe task for user ${userID}`, error);
        throw error;
    }
}

async function changeSnipeTaskSweepPrice(userID, platform, twitterHandleInput, sweepPriceInput) {
    try {
        let user = await getUser(userID, platform); // Getting the user data from the db or else putting the user in the db.
        const snipeTask = user.snipeTasks.find((task) => task.twitter_handle.toLowerCase() === twitterHandleInput.toLowerCase()); // Checks if the snipeTask exists and stores it in memory.
        if (snipeTask) { // If the snipe task exists, return its name.
            let snipeTaskOldSweepPrice = snipeTask.sweepPrice;
            snipeTask.sweepPrice = sweepPriceInput;

            // Save the updated userData back to the JSON file
            writeUserData(userID, platform, user); // Call the writeUserData function

            return snipeTaskOldSweepPrice;
        } else { // If the snipe task doesn't exist, return false.
            return false;
        }
    } catch (error) {
        console.error(`Error changing the snipe task sweep price for user ${twitterHandleInput} ${userID}`, error);
        throw error;
    }
}

async function changeSnipeTaskPrio(userID, platform, twitterHandleInput, prioInput) {
    try {
        let user = await getUser(userID, platform); // Getting the user data from the db or else putting the user in the db.
        const snipeTask = user.snipeTasks.find((task) => task.twitter_handle.toLowerCase() === twitterHandleInput.toLowerCase()); // Checks if the snipeTask exists and stores it in memory.
        if (snipeTask) { // If the snipe task exists, return its old prio
            let snipeTaskOldPrio = snipeTask.prio;
            snipeTask.prio = prioInput;

            // Save the updated userData back to the JSON file
            const userData = require(dataFilePath);
            const userIndex = userData.findIndex(userData => userData.discord_id === user.discord_id || userData.telegram_id === user.telegram_id);

            if (userIndex !== -1) {
                userData[userIndex] = user;
                fs.writeFileSync(dataFilePath, JSON.stringify(userData, null, 2));
            }

            return snipeTaskOldPrio;
        } else { // If the snipe task doesn't exist, return false.
            return false;
        }
    } catch (error) {
        console.error(`Error changing the snipe task prio for user ${twitterHandleInput} ${userID}`, error);
        throw error;
    }
}

async function removeSnipeTask(userID, platform, twitterHandleInput) {
    try {
        let user = await getUser(userID, platform); // Getting the user data from the db or else putting the user in the db.
        let snipeTaskToRemove = user.snipeTasks.find((snipeTask) => snipeTask.twitter_handle.toLowerCase() === twitterHandleInput.toLowerCase()); // Checks if the task is in the tracker and storing it in memory.
        if (snipeTaskToRemove) { // If the group is found in the tracker
            let removedSnipeTaskHandle = snipeTaskToRemove.twitter_handle; // Storing the name so it can be returned.
            user.snipeTasks = user.snipeTasks.filter((task) => task.twitter_handle.toLowerCase() !== twitterHandleInput.toLowerCase()); // Remove the snipeTask

            // Save the updated userData back to the JSON file
            const userData = require(dataFilePath);
            const userIndex = userData.findIndex(userData => userData.discord_id === user.discord_id || userData.telegram_id === user.telegram_id);

            if (userIndex !== -1) {
                userData[userIndex] = user;
                fs.writeFileSync(dataFilePath, JSON.stringify(userData, null, 2));
            }

            return removedSnipeTaskHandle; // Returning the removed snipeTask name.
        } else { // If the task doesn't exist, return false.
            return false;
        }
    } catch (error) {
        console.error("Error removing the snipe task:", error);
        throw error;
    }
}

async function changeSpamTaskSweepPrice(userID, platform, twitterHandleInput, sweepPriceInput) {
    try {
        let user = await getUser(userID, platform); // Getting the user data from the db or else putting the user in the db.
        const spamTask = user.spamTasks.find((task) => task.twitter_handle.toLowerCase() === twitterHandleInput.toLowerCase()); // Checks if the spamTask exists and stores it in memory.
        if (spamTask) { // If the spam task exists, return its name.
            let spamTaskOldSweepPrice = spamTask.sweepPrice;
            spamTask.sweepPrice = sweepPriceInput;

            // Save the updated userData back to the JSON file
            const userData = require(dataFilePath);
            const userIndex = userData.findIndex(userData => userData.discord_id === user.discord_id || userData.telegram_id === user.telegram_id);

            if (userIndex !== -1) {
                userData[userIndex] = user;
                fs.writeFileSync(dataFilePath, JSON.stringify(userData, null, 2));
            }

            return spamTaskOldSweepPrice;
        } else { // If the spam task doesn't exist, return false.
            return false;
        }
    } catch (error) {
        console.error(`Error changing the spam task sweep price for user ${twitterHandleInput} ${userID}`, error);
        throw error;
    }
}

async function changeSpamTaskWalletAddress(userID, platform, twitterHandleInput, walletAddressInput) {
    try {
        let user = await getUser(userID, platform); // Getting the user data from the db or else putting the user in the db.
        const spamTask = user.spamTasks.find((task) => task.twitter_handle.toLowerCase() === twitterHandleInput.toLowerCase()); // Checks if the spamTask exists and stores it in memory.
        if (spamTask) { // If the spam task exists, return its old wallet address.
            let spamTaskOldWalletAddress = spamTask.wallet_address;
            spamTask.wallet_address = walletAddressInput;

            // Save the updated userData back to the JSON file
            writeUserData(userID, platform, user); // Call the writeUserData function

            return spamTaskOldWalletAddress;
        } else { // If the spam task doesn't exist, return false.
            return false;
        }
    } catch (error) {
        console.error(`Error changing the spam task wallet address for user ${twitterHandleInput} ${userID}`, error);
        throw error;
    }
}

async function changeSnipeTaskPrio(userID, platform, twitterHandleInput, prioInput) {
    try {
        let user = await getUser(userID, platform); // Getting the user data from the db or else putting the user in the db.
        const snipeTask = user.snipeTasks.find((task) => task.twitter_handle.toLowerCase() === twitterHandleInput.toLowerCase()); // Checks if the snipeTask exists and stores it in memory.
        if (snipeTask) { // If the snipe task exists, return its old prio
            let snipeTaskOldPrio = snipeTask.prio;
            snipeTask.prio = prioInput;

            // Save the updated userData back to the JSON file
            writeUserData(userID, platform, user); // Call the writeUserData function

            return snipeTaskOldPrio;
        } else { // If the snipe task doesn't exist, return false.
            return false;
        }
    } catch (error) {
        console.error(`Error changing the snipe task prio for user ${twitterHandleInput} ${userID}`, error);
        throw error;
    }
}

async function getWalletAddress(userID, platform) {
    try {
        let user = await getUser(userID, platform); // Getting the user data from the db or else putting the user in the db.
        return user.walletAddress; // Returning the walletAddress
    } catch (error) {
        console.error(`Error getting user ${userID}'s walletAddress.`, error);
        throw error;
    }
}

async function getProxyContract(userID, platform) {
    try {
        let user = await getUser(userID, platform); // Getting the user data from the db or else putting the user in the db.
        return user.proxyContract; // Returning the proxyContract
    } catch (error) {
        console.error(`Error getting user ${userID}'s proxyContract.`, error);
        return null;
    }
}

async function setProxyContract(userID, platform, proxyContractAddress) {
    try {
        let user = await getUser(userID, platform); // Get the user object using the getUser function

        user.proxyContract = proxyContractAddress;

        // Save the updated userData back to the JSON file
        writeUserData(userID, platform, user); // Call the writeUserData function

        return true;
    } catch (error) {
        return false;
    }
}

async function getIdentifier(userID, platform) {
    try {
        let user = await getUser(userID, platform); // Getting the user data from the db or else putting the user in the db.
        return user.identifier; // Returning the identifier
    } catch (error) {
        console.error(`Error getting user ${userID}'s identifier.`, error);
        return null;
    }
}

function getTwitter(walletAddress) {
    const fileName = 'newSignups.csv';
    if (!fs.existsSync(fileName)) { // Check if the file exists, if not, return false
        return false;
    }
    walletAddress = walletAddress.toLowerCase(); // Convert input to lowercase for case-insensitive matching
    const fileContent = fs.readFileSync(fileName, 'utf8');
    const lines = fileContent.split('\n');
    for (const line of lines) {
        if (!line.trim()) {
            continue;
        }
        const [twitterHandle, storedWalletAddress] = line.trim().split(','); // Read the CSV file and search for the Twitter handle
        if (storedWalletAddress.toLowerCase() === walletAddress) {
            return twitterHandle;
        }
    }
    return false; // If not found, return false
}

async function setIdentifier(userID, platform, identifier, walletAddress) {
    try {
        let user = await getUser(userID, platform); // Get the user object using the getUser function

        user.identifier = identifier;
        user.walletAddress = walletAddress;

        // Save the updated userData back to the JSON file
        writeUserData(userID, platform, user); // Call the writeUserData function

        return true;
    } catch (error) {
        return false;
    }
}

async function removeUser(userID, platform) {
    try {
        // Read the user data from the JSON file
        let userData = require(dataFilePath);

        // Find the index of the user to remove
        const userIndex = userData.findIndex(user => {
            if (platform === 'discord') {
                return user.discord_id === userID;
            } else if (platform === 'telegram') {
                return user.telegram_id === userID;
            }
            return false; // Handle other platforms if needed
        });

        if (userIndex !== -1) {
            // Remove the user from the userData array
            userData.splice(userIndex, 1);

            // Write the updated userData back to the JSON file
            fs.writeFileSync(dataFilePath, JSON.stringify(userData, null, 2));

            return true; // User successfully removed
        } else {
            return false; // User not found
        }
    } catch (error) {
        console.error(`Error removing user ${userID} from the file`, error);
        throw error;
    }
}

module.exports = {
    addSnipeTask, addSpamTask, getSnipeTasks, getSpamTasks, removeSpamTask, getSpamSettings, setSpamSettings, getSpamTask, getSnipeTask,
    changeSnipeTaskSweepPrice, changeSnipeTaskPrio, removeSnipeTask, changeSpamTaskSweepPrice, getWalletAddress, getProxyContract, getTwitter,
    setIdentifier, removeUser, changeSpamTaskWalletAddress, getWalletAddress, getIdentifier, loadTasks, setProxyContract
};