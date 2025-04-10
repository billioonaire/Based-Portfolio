const axios = require('axios');
const { ethers, providers } = require('ethers');
const BlocknativeSdk = require('bnc-sdk');
const WebSocket = require('ws');

// Set up the provider (Infura, Alchemy, or any other provider)
const provider = new providers.JsonRpcProvider('https://mainnet.infura.io/v3/f823ce4ae5d242bdb27477b7e86fd7f0');

// Blocknative SDK setup for real-time transaction monitoring
const options = {
    dappId: "a0ac8a1f-0df5-441c-8620-8b98d12c6298", // Replace with your Blocknative API key
    networkId: 1,
    ws: WebSocket,
};
const blocknative = new BlocknativeSdk(options);

// Discord webhook URLs
const UNCHAINED_METADROP_URL = 'https://discord.com/api/webhooks/1170074192725672016/gyyj2b4RQpkPlIxNK-K0pXn50f3r14iuCnA2TveU8zQ8sF5IUY98nqmLpBv43_tMom7L';
const SPLIZZ_METADROP_URL = 'https://discord.com/api/webhooks/1170423916729204756/83uBTKcpCHJgf_QzhmE-5oghcHVCvKS5iyE7p6bkTvRmb0wg53hJLVSEAc2NUiRSqeF1';

// Seen transactions tracker
const seenTransactions = new Set();

// Tenderly setup
const TENDERLY_USER = "w00fy7";
const TENDERLY_PROJECT = "project";
const TENDERLY_ACCESS_KEY = "RRB6g6qVEwUaRmgs2erqyZusyuSW3S9y";
const contractAddress = '0x9a67F5E015f838b911f2d13566e4BE05C5BA777F'; 
const contractAbi = [
    "event TokenCreated(address indexed token, address indexed deployer, string name, string symbol)"
];

// Creating a contract instance
const contract = new ethers.Contract(contractAddress, contractAbi, provider);

// Function to simulate transaction and extract logs
async function simulateTransaction(transaction) {
    try {
        const response = await axios.post(
            `https://api.tenderly.co/api/v1/account/${TENDERLY_USER}/project/${TENDERLY_PROJECT}/simulate`,
            {
                save: false,
                save_if_fails: false,
                simulation_type: "full",
                network_id: "1",
                from: transaction.from,
                input: transaction.input,
                to: transaction.to,
                value: transaction.value,
                access_list: [],
                generate_access_list: true,
            },
            {
                headers: {
                    "X-Access-Key": TENDERLY_ACCESS_KEY
                },
            }
        );

        const logs = response.data.transaction.transaction_info.logs;
        return logs;
    } catch (error) {
        console.error('Error during simulation:', error.response ? error.response.data : error.message);
        return null;
    }
}

// Function to send the webhook
async function sendNewEarlyMetadropEmbed(data) {
    const embed = {
        title: "New Token Created",
        url: `https://etherscan.io/address/${data.contractAddress}`,
        color: 0xff045f,
        fields: [
            { name: `🔖 ${data.name} (${data.symbol})`, value: '', inline: false },
            { name: `📍 Contract Address`, value: `${data.contractAddress}`, inline: false },
            { name: `📤 Deployer`, value: `${data.deployer}`, inline: false },
        ],
        timestamp: new Date(),
        footer: {
            text: "Unchained",
            icon_url: "https://cdn.discordapp.com/attachments/888244235407605800/1080223489224626308/UNCHAINED_AGENCY_LOGO_TWITTER_PROFILE_PICTURE_CIRCLE.png"
        }
    };

    try {
        await axios.post(UNCHAINED_METADROP_URL, {embeds: [embed]});
        await axios.post(SPLIZZ_METADROP_URL, {embeds: [embed]});
        console.log("Webhook sent successfully.");
    } catch (error) {
        console.error("Error sending webhook:", error);
    }
}

// Function to process logs and ensure correct matching
function processTokenCreatedLogs(logs) {
    const tokenCreatedLogs = [];

    logs.forEach((log) => {
        if (log.name === 'TokenCreated') {
            const token = log.inputs[0].value;
            const deployer = log.inputs[1].value;
            const name = log.inputs[2].value;
            const symbol = log.inputs[3].value;

            tokenCreatedLogs.push({
                contractAddress: token,
                deployer: deployer,
                name: name,
                symbol: symbol,
            });
        }
    });

    return tokenCreatedLogs;
}

// Start monitoring function using Blocknative
async function startMetadropMonitor() {
    const { emitter } = blocknative.account(contractAddress);

    // Listen for new pending transactions
    emitter.on('txPool', async (transaction) => {
        if (transaction.status === "pending" && !seenTransactions.has(transaction.id)) {
            seenTransactions.add(transaction.id);

            console.log(`Pending transaction detected: ${transaction.id}`);
            const logs = await simulateTransaction(transaction);

            // Process logs if simulation was successful
            if (logs) {
                const tokenCreatedLogs = processTokenCreatedLogs(logs);

                // Ensure the correct token contract is being processed
                tokenCreatedLogs.forEach((tokenData) => {
                    console.log(`Token Created: ${tokenData.name} (${tokenData.symbol}) at ${tokenData.contractAddress} by deployer ${tokenData.deployer}`);

                    // Send webhook notification
                    sendNewEarlyMetadropEmbed(tokenData);
                });
            }
        }
    });

    // Listen for confirmed transactions
    emitter.on('txConfirmed', (transaction) => {
        if (!seenTransactions.has(transaction.id)) {
            console.log(`Confirmed transaction (not seen in txPool): ${transaction.id}`);
        }
        seenTransactions.delete(transaction.id);
    });
}

console.log("Starting Metadrop monitor...");

module.exports = {
    startMetadropMonitor
};
