const fs = require('fs');

const settingsFilePath = './userSettings.json';

const defaultSettings = { // Provide default settings
    antiRug: true,
    slippage: 0.01,
    maxGasPrice: 200,
    maxGasLimit: 300000,
    autoApprove: false,
    buyConfirmation: true,
    buyGasPrice: 150,
    maxBuyTax: 5,
    maxSellTax: 10,
    sellConfirmation: true,
    sellGasPrice: 200,
};

function getUserSettings(userId) {
    try {
        const settingsData = fs.readFileSync(settingsFilePath, 'utf8'); // Read the userSettings.json file
        const allUserSettings = JSON.parse(settingsData); // Parse the JSON data
        if (allUserSettings && allUserSettings[userId] && Object.keys(allUserSettings[userId]).length > 0) { // Check if the specified user has settings
            return allUserSettings[userId];
        } else {
            console.log(`User ID '${userId}' has no settings. Using default settings.`); // Provide default settings
            const defaultSettings = {
                antiRug: true,
                slippage: 5,
                maxGasPrice: 200,
                maxGasLimit: 500000,
                autoApprove: false,
                buyConfirmation: true,
                buyGasPrice: 150,
                maxBuyTax: 5,
                maxSellTax: 10,
                sellConfirmation: true,
                sellGasPrice: 200,
            };
            allUserSettings[userId] = defaultSettings; // Save default settings for the specified user to userSettings.json
            fs.writeFileSync('userSettings.json', JSON.stringify(allUserSettings, null, 2), 'utf8');
            return defaultSettings;
        }
    } catch (error) {
        console.error('Error reading or parsing settings:', error.message); // Provide default settings in case of an error
        return {
            antiRug: true,
            slippage: 0.01,
            maxGasPrice: 200,
            maxGasLimit: 500000,
            autoApprove: false,
            buyConfirmation: true,
            buyGasPrice: 150,
            maxBuyTax: 5,
            maxSellTax: 10,
            sellConfirmation: true,
            sellGasPrice: 200,
        };
    }
}

function updateUserSetting(userId, settingName, newValue) {
    try {
        const settingsData = fs.readFileSync(settingsFilePath, 'utf8'); // Read the settings.json file
        const allUserSettings = JSON.parse(settingsData); // Parse the JSON data
        if (allUserSettings && allUserSettings[userId] && Object.keys(allUserSettings[userId]).length > 0) { // Check if the specified user has settings
            const previousValue = allUserSettings[userId][settingName];
            allUserSettings[userId][settingName] = newValue; // Update the specified setting for the user
            fs.writeFileSync(settingsFilePath, JSON.stringify(allUserSettings, null, 2), 'utf8'); // Save the updated settings to settings.json
            console.log(`Setting '${settingName}' updated for user ID '${userId}'.`);
            return previousValue;
        } else {
            console.log(`User ID '${userId}' not found or has no settings.`);
            return null;
        }
    } catch (error) {
        console.error('Error updating setting:', error.message);
        return null;
    }
}

module.exports = { getUserSettings, updateUserSetting };