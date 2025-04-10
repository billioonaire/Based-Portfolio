// contractMonitor.js
const monitorFunctions = require("../monitorFunctions.js");

const { ethers, providers, Contract } = require('ethers');
const provider = new providers.JsonRpcProvider('https://mainnet.infura.io/v3/4798af18ca8244b78f03456b5d69823d'); // e.g., Infura, Alchemy, or a local node

const axios = require('axios');

const API_URL = 'https://api.pinksale.finance/api/v1/pool/list?page=1&filterBy=inprogress&sortBy=hardcap&limit=40&chainId=1&poolTypes[]=presale&poolTypes[]=fairlaunch';
let lastSales = [];

async function sendNewSaleEmbed(data) {
    const UNCHAINED_PINKSALE = 'https://discord.com/api/webhooks/1170204837376434256/kRbMCjzaYoT4TfLC8T2j0Z0Tune0rbMnc3PbCeACrGGBinn3uxzvONXpvVwZsJJLcG17';
    const NUN_PINKSALE = 'https://discord.com/api/webhooks/1194771766959157330/wRSUsEuu-G30-uJAQenFss7NW9sa15FqW1inJd3Dz2oiC7vHEzoZYljy6fJYBIPIcF78'
    const formatAddress = (address) => {
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    };

    const embed = {
        title: "New Token Sale Detected",
        url: `https://www.pinksale.finance/launchpad/${data.poolAddress}?chain=ETH`, // Assuming poolAddress is the relevant URL
        color: 0xff045f, // Light blue color, you can set your preferred HEX color
        fields: [
            { name: `🔖 ${data.name} (${data.symbol})`, value: "", inline: false },
            { name: `📍 Token Address`, value: `[${formatAddress(data.tokenAddress)}](https://etherscan.io/address/${data.tokenAddress})`, inline: false },
            { name: `🧢 Soft Cap`, value: data.softCap || 'Not Set', inline: true },
            { name: `⛑ Hard Cap`, value: data.hardCap || 'Not Set', inline: true },
            { name: `🔢 Total Raised`, value: data.totalRaised, inline: true },
            { name: `🕳 Pool Address`, value: `[${formatAddress(data.poolAddress)}](https://etherscan.io/address/${data.poolAddress})`, inline: true },
            { name: `🔽 Min Contribution`, value: data.minContribution || 'Not Set', inline: true },
            { name: `🔼 Max Contribution`, value: data.maxContribution || 'Not Set', inline: true },
            { name: `🕒 Start Time`, value: `<t:${data.startTime}:R>`, inline: true },
            { name: `⏳ End Time`, value: `<t:${data.endTime}:R>`, inline: true },
        ],
        timestamp: new Date(),
        footer: {
            text: "Unchained",
            icon_url: "https://cdn.discordapp.com/attachments/888244235407605800/1080223489224626308/UNCHAINED_AGENCY_LOGO_TWITTER_PROFILE_PICTURE_CIRCLE.png"
        }
    };
    
    try {
        // Post the embed to the webhook
        await axios.post(UNCHAINED_PINKSALE, { embeds: [embed] });
        await axios.post(NUN_PINKSALE, { embeds: [embed] });

        console.log("Pinksale Webhook sent successfully.");
    } catch (error) {
        console.error("Error sending webhook:", error);
    }
}

const formatSaleData = (sale) => {
    return {
        name: sale.token.name,
        symbol: sale.token.symbol,
        softCap: sale.pool.softCap/1000000000000000000,
        hardCap: sale.pool.hardCap/1000000000000000000,
        tokenAddress: sale.token.address,
        poolAddress: sale.pool.address,
        totalRaised: sale.pool.totalRaised/1000000000000000000,
        minContribution: sale.pool.min/1000000000000000000,
        maxContribution: sale.pool.max/1000000000000000000,
        startTime: sale.pool.startTime,
        endTime: sale.pool.endTime
    };
};

const checkForNewSales = async () => {
    try {
        const response = await axios.get(API_URL);
        const currentSales = response.data.docs || [];

        const currentSaleIndexes = new Set(currentSales.map(sale => sale.index));
        const newSales = currentSales.filter(sale => !lastSales.includes(sale.index));

        if (newSales.length > 0) {
            console.log('New sales found:');
            newSales.forEach(sale => {
                const formattedSale = formatSaleData(sale);

                console.log(formattedSale);

                sendNewSaleEmbed(formattedSale)

            });
        }

        lastSales = Array.from(currentSaleIndexes);
    } catch (error) {
        console.error('Error Fetching Pinksale');
    }
};

async function pinksaleMonitorStart(discordClient) {
    console.log("Starting Pinksale Monitor");

    // Initial fetch to populate lastSales with the current sales indices
    try {
        const response = await axios.get(API_URL);
        const initialSales = response.data.docs || [];
        lastSales = initialSales.map(sale => sale.index);
        console.log('Initial sales loaded.');
    } catch (error) {
        console.error('Error fetching initial sales for pinksale');
    }

    // Start the interval to check for new sales
    setInterval(checkForNewSales, 60000);
}

module.exports = {
    pinksaleMonitorStart,
};
