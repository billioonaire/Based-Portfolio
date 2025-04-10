const axios = require('axios');
const fs = require('fs');
const path = require('path');
const etherscanBaseUrl = '';


function startEtherscanKeyCheck() {
    // Run the scraping function every 5 seconds
    checkAndCleanApiKeys("./data/etherscanAPI.txt");
    setInterval(() => {
        checkAndCleanApiKeys("./data/etherscanAPI.txt").catch(console.error);
    }, 360000);

}

// Export the function for use in other modules


async function checkApiKey(apiKey) {
    try {
        // Using the account balance API as a test query
        // '0x0000000000000000000000000000000000000000' is a dummy Ethereum address
        const response = await axios.get(`https://api.etherscan.io/api?module=account&action=balance&address=0x0000000000000000000000000000000000000000&tag=latest&apikey=${apiKey}`);
        // Etherscan API returns status '1' for a successful query
        return response.status === 200 && response.data.status === '1';
    } catch (error) {
        // Log the error for debugging purposes
        console.error('Error in API Key check:', error);
        return false;
    }
}


async function checkAndCleanApiKeys(filePath) {
    const keys = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
    const validKeys = [];

    for (const key of keys) {
        const isValid = await checkApiKey(key);
        if (isValid) {
            validKeys.push(key);
        } else {
            console.log(`Removing invalid key: ${key}`);
        }
    }

    fs.writeFileSync(filePath, validKeys.join('\n'));
    console.log(`Cleaned API keys. Valid keys count: ${validKeys.length}`);
}

module.exports = {
    startEtherscanKeyCheck,
};