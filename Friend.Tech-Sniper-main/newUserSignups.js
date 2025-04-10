const axios = require('axios');
const fs = require('fs');
const { sendNewSignUpEmbed } = require(`./embedCreator.js`);

const headers = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "max-age=0",
    "Sec-Ch-Ua": '"Google Chrome";v="117", "Not;A=Brand";v="8", "Chromium";v="117"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": "Windows",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36"
};

const proxyFileContents = fs.readFileSync(`./proxies.txt`, 'utf-8'); // Read the contents of the file

const proxiesArray = proxyFileContents.split('\n').map(line => line.trim()); // Split the proxies file into an array.
function getRandomProxy() { // Gets a random proxy from proxies.txt
    const validProxies = proxiesArray.filter(proxy => proxy !== ''); // Filter out any empty lines
    const randomIndex = Math.floor(Math.random() * validProxies.length); // Get a random index within the range of valid proxies
    return validProxies[randomIndex]; // Return a random proxy
}

async function checkUserIdExists(userId) {
    const url = `https://prod-api.kosetto.com/users/by-id/${userId}`;
    let proxy = getRandomProxy();
    try {
        const response = await axios.get(url, {
            host: proxy.split(`:`)[0],
            port: proxy.split(`:`)[1],
            headers
        });
        if (response.status == 200) {
            return response.data
        }

    } catch (error) {
        if (error.response && error.response.status === 404) {
            return false;
        } else {
            console.error(`Failed to check userId ${userId} Retrying...`);

            await new Promise(resolve => setTimeout(resolve, 3000));
            return await checkUserIdExists(userId);
        }
    }
}

async function findNewestUserId(startingId) {
    let currentId = startingId;

    while (true) {
        const exists = await checkUserIdExists(currentId);
        if (!exists) {
            break;
        }
        currentId *= 2;
    }

    let lowerBound = currentId / 2;
    let upperBound = currentId;
    currentId = Math.floor((upperBound + lowerBound) / 2);

    while (lowerBound <= upperBound) {
        const exists = await checkUserIdExists(currentId);
        if (exists) {
            lowerBound = currentId + 1;
        } else {
            upperBound = currentId - 1;
        }
        currentId = Math.floor((upperBound + lowerBound) / 2);
    }

    return upperBound;
}

async function pollForNewUsers(discordClient, currentNewestUserId, taskHandler) {
    const data = await checkUserIdExists(currentNewestUserId + 1);
    if (data) {
        console.log(`Sending new sign up embed for ${data.twitterUsername}`);
        addNewSignup(data.twitterUsername, data.address); // Adding the new user to the csv.
        taskHandler.spamAddressCheck(data.twitterUsername, data.address);
        await sendNewSignUpEmbed(discordClient, data.address, data.twitterUsername, data.twitterName);
        currentNewestUserId++;
        console.log(`Found new user with userId: ${currentNewestUserId}`);
        fs.writeFileSync('lastUserId.txt', currentNewestUserId.toString());
    }
    setTimeout(() => pollForNewUsers(discordClient, currentNewestUserId, taskHandler), 3000);  // Poll every 3 seconds
}

async function startNewUserMonitor(discordClient, taskHandler) {

    let startingId = 200000;  // Default starting point
    if (fs.existsSync('lastUserId.txt')) {
        startingId = parseInt(fs.readFileSync('lastUserId.txt', 'utf-8'), 10);
    }
    const currentNewestUserId = await findNewestUserId(startingId);
    console.log(`Newest userId is: ${currentNewestUserId}`);
    pollForNewUsers(discordClient, currentNewestUserId, taskHandler);
}

function addNewSignup(twitterHandle, walletAddress) {
    const fileName = 'newSignups.csv';
    if (!fs.existsSync(fileName)) { // Check if the file exists, if not, create it with headers
        fs.writeFileSync(fileName, 'twitterHandle,walletAddress\n');
    }
    const newData = `${twitterHandle},${walletAddress}\n`; // Append the new signup to the CSV file
    fs.appendFileSync(fileName, newData);
}

function getWallet(twitterHandle) {
    const fileName = 'newSignups.csv';
    if (!fs.existsSync(fileName)) { // Check if the file exists, if not, return false
        return false;
    }
    twitterHandle = twitterHandle.toLowerCase(); // Convert input to lowercase for case-insensitive matching
    const fileContent = fs.readFileSync(fileName, 'utf8');
    const lines = fileContent.split('\n');
    for (const line of lines) { // Read the CSV file and search for the wallet address
        const [storedTwitterHandle, walletAddress] = line.trim().split(',');
        if (storedTwitterHandle.toLowerCase() === twitterHandle) {
            return walletAddress;
        }
    }
    return false; // If not found, return false
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

module.exports = { startNewUserMonitor, getWallet, getTwitter };