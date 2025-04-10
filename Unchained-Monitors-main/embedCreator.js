const { EmbedBuilder } = require('discord.js');
const { getSettingsSelectMenu } = require(`./buttonCreator.js`);
const fs = require('fs');
const { ethers, providers, Contract } = require('ethers');
const { eth } = require('web3');

const provider = new providers.JsonRpcProvider(process.env.ETH_RPC_URL);

function getDefaultEmbed() { // A function to get a default Unchained embed.
    let defaultEmbed = new EmbedBuilder()
        .setColor('#ff045f')
        .setTimestamp()
        .setFooter({ text: "Unchained", iconURL: "https://cdn.discordapp.com/attachments/888244235407605800/1080223489224626308/UNCHAINED_AGENCY_LOGO_TWITTER_PROFILE_PICTURE_CIRCLE.png" });
    return defaultEmbed;
}

async function editSettingsEmbed(interaction, userSettings) { // A function that returns the embed displaying the users settings.
    let settingsEmbed = getDefaultEmbed()
        .setTitle(`**Settings**`)
        .setDescription(`**📍 General**
    Anti-Rug (NOT FUNCTIONAL YET): \`${userSettings.antiRug}\`
    Slippage: \`${userSettings.slippage}\`
    Max Gas Price: \`${userSettings.maxGasPrice}\`
    Max Gas Limit: \`${userSettings.maxGasLimit}\`
    Auto Approve: \`${userSettings.autoApprove}\`
    
    **📌 Buy**
    Buy Confirmation: \`${userSettings.buyConfirmation}\`
    Buy Gas Price: \`${userSettings.buyGasPrice}\`
    Max Buy Tax: \`${userSettings.maxBuyTax}\`
    
    **📌 Sell**
    Sell Confirmation: \`${userSettings.sellConfirmation}\`
    Sell Gas Price: \`${userSettings.sellGasPrice}\`
    Max Sell Tax: \`${userSettings.maxSellTax}\``);
    if (interaction.isCommand()) { // If the interaction is a command you must use editreply instead of update.
        await interaction.editReply({
            embeds: [settingsEmbed],
            components: [getSettingsSelectMenu(userSettings)]
        });
    } else {
        await interaction.editReply({
            embeds: [settingsEmbed],
            components: [getSettingsSelectMenu(userSettings)]
        });
    }
}

async function updateIntegerRequiredInputEmbed(interaction) { // Replies an embed saying that an integer is required.
    let invalidInputEmbed = getDefaultEmbed()
        .setTitle(`**Invalid Input**`)
        .setDescription(`\`${interaction.fields.components[0].components[0].value}\` is not a valid input! Please input an integer.`);
    interaction.update({
        embeds: [invalidInputEmbed],
        components: [],
        ephemeral: true
    });
}

async function updateSettingChangedEmbed(interaction, settingName, oldSetting, newSetting) { // Replies an embed saying that a setting has been updated.
    let settingChangedEmbed = getDefaultEmbed()
        .setTitle(`**Settings Changed**`)
        .setDescription(`You have successfully changed ${settingName.replace(/([A-Z])/g, ' $1').charAt(0).toUpperCase() + settingName.replace(/([A-Z])/g, ' $1').slice(1).trim()} from \`${oldSetting}\` to \`${newSetting}\``);
    interaction.update({
        embeds: [settingChangedEmbed],
        components: [],
        ephemeral: true
    });
}

const readNametagsFromFile = (filePath) => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const nametags = {};
    lines.forEach(line => {
        const [nametag, wallet] = line.split(':');
        nametags[wallet.trim().toLowerCase()] = nametag.trim();
    });
    return nametags;
};

const nametags = readNametagsFromFile('nametags.txt');

function loadConfig() {
    try {
        const rawData = fs.readFileSync('channelSettings.json');
        return JSON.parse(rawData);
    } catch (error) {
        console.error('Error reading the config file:', error);
        return null;
    }
}
const checkForENS = async (address) => {

    let ensName = await provider.lookupAddress(address);//Using the ethers library to look up the ENS. uses the Node in the .env file as provider
    if (ensName) {//If the inputted wallet has an ENS address, return it. Otherwise, return the same address as inputted.
        return ensName;
    }
    return null;
};
const formatAddress = async (address) => {
    if (nametags[address.toLowerCase()]) {
        return nametags[address.toLowerCase()];
    }

    const ens = await checkForENS(address);
    if (ens) {
        return ens;
    }

    return `${address.substring(0, 5)}...${address.substring(address.length - 5)}`;
};



async function sendContractDeployedEmbeds(data, discord) {
    // Format previous contracts
    const formattedPreviousContracts = data.previousContracts && data.previousContracts.length > 0
        ? await Promise.all(data.previousContracts.slice(0, 3).map(async contract => {
            const symbolOrName = contract.symbol || "Contract";
            const formattedAddress = await formatAddress(contract.contractAddress);
            return `[${symbolOrName}](https://etherscan.io/address/${contract.contractAddress})`;
        }))
        : ["None"];

    // Format funding sources
    let fundingSourcesDisplay = "Unknown";
    let ethAmounts = "Unknown";
    let times = "Unknown";

    if (data.fundingSources && data.fundingSources.length > 0) {
        const formattedFundingSources = await Promise.all(data.fundingSources.slice(0, 3).map(async source => {
            const formattedAddress = await formatAddress(source.address);
            return `[${formattedAddress}](https://etherscan.io/address/${source.address})`;
        }));

        fundingSourcesDisplay = formattedFundingSources.join('\n');
        ethAmounts = data.fundingSources.slice(0, 3).map(source => `${source.value} ETH`).join('\n');
        times = data.fundingSources.slice(0, 3).map(source => `<t:${source.time / 1000}:R>`).join('\n');

        if (data.fundingSources.length > 3) {
            fundingSourcesDisplay += `\n+ ${data.fundingSources.length - 3} other sources`;
            ethAmounts += '\n+ more';
            times += '\n+ more';
        }
    }

    // Create the embed
    const embed = new EmbedBuilder()
        .setTitle("New Contract Deployed")
        .setURL(`https://etherscan.io/address/${data.contractAddress}`)
        .setColor(0xff045f);

    // Add fields conditionally
    if (!(data.contractInfo && data.contractInfo.name && data.contractInfo.symbol)) {
        return "No contract information";
    }

    embed.addFields(
        { name: `🔖 ${data.contractInfo.name} (${data.contractInfo.symbol})`, value: ' ', inline: false },
        { name: `📍 Contract Address`, value: `\`\`\`${data.contractAddress}\`\`\``, inline: false },
        {
            name: "🛠️ Contract Deployer", 
            value: `[${await formatAddress(data.contractCreator)}](https://etherscan.io/address/${data.contractCreator})`, 
            inline: true
        },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: 'ETH Balance', value: `${data.deployerBalance} ETH`, inline: true }
    );

    if (data.previousContracts.length > 0) {
        const displayedContracts = data.previousContracts.slice(0, 3);
        let contractsDisplay = formattedPreviousContracts.join('\n');
        let timestampsDisplay = displayedContracts.map(contract => `<t:${contract.deploymentTimestamp / 1000}:R>`).join('\n');

        if (data.previousContracts.length > 3) {
            contractsDisplay += `\n+ ${data.previousContracts.length - 3} other contracts`;
            timestampsDisplay += '\n+ more';
        }

        embed.addFields(
            { name: "Previous Contracts", value: contractsDisplay, inline: true },
            { name: '\u200B', value: '\u200B', inline: true},
            { name: "Deployment Times", value: timestampsDisplay, inline: true }
        );
    }

    embed.addFields(
        { name: "💰 Funding Sources", value: fundingSourcesDisplay, inline: true },
        { name: 'ETH Amount', value: ethAmounts, inline: true },
        { name: 'Time', value: times, inline: true },
        { name: "🔗 Links", value: `[Dextools](https://www.dextools.io/app/en/ether/pair-explorer/${data.contractAddress}) | [Dexscreener](https://dexscreener.com/ethereum/${data.contractAddress}) | [DexSpy](https://dexspy.io/eth/token/${data.contractAddress})\n[Maestro](https://t.me/MaestroSniperBot?start=${data.contractAddress}) | [Banana](https://t.me/BananaGunSniper_bot?start=ref_Unchained_${data.contractAddress}) | [Shuriken](https://t.me/ShurikenTradeBot?start=qt-inworkwetrust-${data.contractAddress}) | [OttoSim](https://t.me/OttoSimBot?start=${data.contractAddress})`, inline: false }
    )
    .setTimestamp()
    .setFooter({ text: "Unchained", iconURL: "https://cdn.discordapp.com/attachments/888244235407605800/1080223489224626308/UNCHAINED_AGENCY_LOGO_TWITTER_PROFILE_PICTURE_CIRCLE.png" });

    // Send the embed to the specified channel
    try {
        const config = loadConfig();
        if (config && config.ethereumContractDeploy) {
            for (const element of config.ethereumContractDeploy) {
                const channel = discord.channels.cache.get(element);
                if (channel) {
                    await channel.send({ embeds: [embed] });
                } else {
                    console.error(`Channel not found: ${element}`);
                }
            }
        }
    } catch (error) {
        console.error("Error sending message to Discord:", error);
    }
}
async function sendBaseContractDeployedEmbeds(data, discord) {
    // Format previous contracts
    const formattedPreviousContracts = data.previousContracts && data.previousContracts.length > 0
        ? await Promise.all(data.previousContracts.slice(0, 3).map(async contract => {
            const symbolOrName = contract.symbol || "Contract";
            const formattedAddress = await formatAddress(contract.contractAddress);
            return `[${symbolOrName}](https://etherscan.io/address/${contract.contractAddress})`;
        }))
        : ["None"];

    // Format funding sources
    let fundingSourcesDisplay = "Unknown";
    let ethAmounts = "Unknown";
    let times = "Unknown";

    if (data.fundingSources && data.fundingSources.length > 0) {
        const formattedFundingSources = await Promise.all(data.fundingSources.slice(0, 3).map(async source => {
            const formattedAddress = await formatAddress(source.address);
            return `[${formattedAddress}](https://basescan.org/address/${source.address})`;
        }));

        fundingSourcesDisplay = formattedFundingSources.join('\n');
        ethAmounts = data.fundingSources.slice(0, 3).map(source => `${source.value} ETH`).join('\n');
        times = data.fundingSources.slice(0, 3).map(source => `<t:${source.time / 1000}:R>`).join('\n');

        if (data.fundingSources.length > 3) {
            fundingSourcesDisplay += `\n+ ${data.fundingSources.length - 3} other sources`;
            ethAmounts += '\n+ more';
            times += '\n+ more';
        }
    }

    // Create the embed
    const embed = new EmbedBuilder()
        .setTitle("New Base Contract Deployed")
        .setURL(`https://basescan.org/address/${data.contractAddress}`)
        .setColor(0xff045f);

    // Add fields conditionally
    if (!(data.contractInfo && data.contractInfo.name && data.contractInfo.symbol)) {
        return "No contract information";
    }

    embed.addFields(
        { name: `🔖 ${data.contractInfo.name} (${data.contractInfo.symbol})`, value: ' ', inline: false },
        { name: `📍 Contract Address`, value: `\`\`\`${data.contractAddress}\`\`\``, inline: false },
        {
            name: "🛠️ Contract Deployer", 
            value: `[${await formatAddress(data.contractCreator)}](https://basescan.org/address/${data.contractCreator})`, 
            inline: true
        },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: 'ETH Balance', value: `${data.deployerBalance} ETH`, inline: true }
    );

    if (data.previousContracts.length > 0) {
        const displayedContracts = data.previousContracts.slice(0, 3);
        let contractsDisplay = formattedPreviousContracts.join('\n');
        let timestampsDisplay = displayedContracts.map(contract => `<t:${contract.deploymentTimestamp / 1000}:R>`).join('\n');

        if (data.previousContracts.length > 3) {
            contractsDisplay += `\n+ ${data.previousContracts.length - 3} other contracts`;
            timestampsDisplay += '\n+ more';
        }

        embed.addFields(
            { name: "Previous Contracts", value: contractsDisplay, inline: true },
            { name: '\u200B', value: '\u200B', inline: true},
            { name: "Deployment Times", value: timestampsDisplay, inline: true }
        );
    }

    embed.addFields(
        { name: "💰 Funding Sources", value: fundingSourcesDisplay, inline: true },
        { name: 'ETH Amount', value: ethAmounts, inline: true },
        { name: 'Time', value: times, inline: true },
        { name: "🔗 Links", value: generateBaseLinks(data.contractAddress), inline: false }
    )
    .setTimestamp()
    .setFooter({ text: "Unchained", iconURL: "https://cdn.discordapp.com/attachments/888244235407605800/1080223489224626308/UNCHAINED_AGENCY_LOGO_TWITTER_PROFILE_PICTURE_CIRCLE.png" });

    // Send the embed to the specified channel
    try {
        const config = loadConfig();
        if (config && config.baseContractDeploy) {
            for (const element of config.baseContractDeploy) {
                const channel = discord.channels.cache.get(element);
                if (channel) {
                    await channel.send({ embeds: [embed] });
                } else {
                    console.error(`Channel not found: ${element}`);
                }
            }
        }
    } catch (error) {
        console.error("Error sending message to Discord:", error);
    }
}
async function sendUnicryptEmbeds(data, discord) {
    // Check if contractInfo is available


    console.log(data)
    if (!(data.contractInfo && data.contractInfo.name && data.contractInfo.symbol)) {
        return "No contract information";
    }

    const formattedPreviousContracts = data.previousContracts && data.previousContracts.length > 0
        ? await Promise.all(data.previousContracts.map(async contract => {
            const symbolOrName = contract.symbol || "Contract";
            const formattedAddress = await formatAddress(contract.contractAddress);
            return `[${symbolOrName}](https://etherscan.io/address/${contract.contractAddress})`;
        }))
        : ["None"];

    const previousContractsDisplay = formattedPreviousContracts.join('\n');


    // Format funding sources
    const formattedFundingSources = data.fundingSources && data.fundingSources.length > 0
        ? await Promise.all(data.fundingSources.map(async source => {
            const formattedAddress = await formatAddress(source.address);
            return `[${formattedAddress}](https://etherscan.io/address/${source.address})`;
        }))
        : ["None"];

    const ethAmounts = data.fundingSources.map(source => `${source.value} ETH`).join('\n');
    const times = data.fundingSources.map(source => `<t:${source.time / 1000}:R>`).join('\n');

    let title = "Liquidity Locked";
    let word = "Lock"
    if (data.lockUnixTimestamp == "Burned"){
        title = "Liquidity Burned";
        word = "Burn";
    }
    let displayTime = data.lockUnixTimestamp !== "Burned" ? `<t:${data.lockUnixTimestamp}:R>` : '';

    // Create the embed
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setURL(`https://etherscan.io/address/${data.contractAddress}`)
        .setColor(0xff045f)
        .addFields(
            { name: `🔖 ${data.contractInfo.name} (${data.contractInfo.symbol})`, value: ' ', inline: false },
            { name: `${word} Percentage`, value: `${formatLockPercent(data.lockPercent, data.lockUnixTimestamp)} ${displayTime}`, inline: false },
            { name: `📍 Contract Address`, value: `\`\`\`${data.contractAddress}\`\`\``, inline: false },
            {
                name: "🛠️ Contract Deployer", value: `[${await formatAddress(data.contractCreator)}](https://etherscan.io/address/${data.contractCreator})`, inline: true
            },
            { name: '\u200B', value: '\u200B', inline: true},
            { name: 'ETH Balance', value: `${data.deployerBalance} ETH`, inline: true })

            if (data.previousContracts.length != 0) { 
                embed.addFields(
                    { name: "Previous Contracts", value: previousContractsDisplay, inline: true },
                    { name: '\u200B', value: '\u200B', inline: true},
                    { name: "Deployment Times", value: data.previousContracts.map(contract => `<t:${contract.deploymentTimestamp / 1000}:R>`).join('\n'), inline: true }
                );
            }
            embed.addFields(
            { name: "💰 Funding Sources", value: formattedFundingSources.join('\n'), inline: true },
            { name: 'ETH Amount', value: ethAmounts, inline: true },
            { name: 'Time', value: times, inline: true },
            { name: "🔗 Links", value: generateLinks(data), inline: false }
        )
        embed.setTimestamp()
        embed.setFooter({ text: "Unchained", iconURL: "https://cdn.discordapp.com/attachments/888244235407605800/1080223489224626308/UNCHAINED_AGENCY_LOGO_TWITTER_PROFILE_PICTURE_CIRCLE.png" });

    // Send the embed to the specified channel
    try {
        const config = loadConfig();
        if (config && config.unicryptLock) {
            for (const element of config.unicryptLock) {
                const channel = discord.channels.cache.get(element);
                if (channel) {
                    await channel.send({ embeds: [embed] });
                } else {
                    console.error(`Channel not found: ${element}`);
                }
            }
        }
    } catch (error) {
        console.error("Error sending message to Discord:", error);
    }
}
async function sendVerifiedEmbed(data, discord) {
    // Format previous contracts
    const formattedPreviousContracts = data.previousContracts && data.previousContracts.length > 0
        ? await Promise.all(data.previousContracts.slice(0, 3).map(async contract => {
            const symbolOrName = contract.symbol || "Contract";
            const formattedAddress = await formatAddress(contract.contractAddress);
            return `[${symbolOrName}](https://etherscan.io/address/${contract.contractAddress})`;
        }))
        : ["None"];

    // Format funding sources
    let fundingSourcesDisplay = "Unknown";
    let ethAmounts = "Unknown";
    let times = "Unknown";

    if (data.fundingSources && data.fundingSources.length > 0) {
        const formattedFundingSources = await Promise.all(data.fundingSources.slice(0, 3).map(async source => {
            const formattedAddress = await formatAddress(source.address);
            return `[${formattedAddress}](https://etherscan.io/address/${source.address})`;
        }));

        fundingSourcesDisplay = formattedFundingSources.join('\n');
        ethAmounts = data.fundingSources.slice(0, 3).map(source => `${source.value} ETH`).join('\n');
        times = data.fundingSources.slice(0, 3).map(source => `<t:${Math.floor(source.time / 1000)}:R>`).join('\n');

        if (data.fundingSources.length > 3) {
            fundingSourcesDisplay += `\n+ ${data.fundingSources.length - 3} other sources`;
            ethAmounts += '\n+ more';
            times += '\n+ more';
        }
    }

    const contractName = data.contractInfo?.name || 'Unknown Contract';
    const contractSymbol = data.contractInfo?.symbol || '';

    const embed = new EmbedBuilder()
        .setTitle(`New Verified Contract`)
        .setColor(0xFF045F)
        .setURL(`https://etherscan.io/address/${data.contractAddress}`)
        .addFields(
            { name: `🔖 ${contractName} (${contractSymbol})`, value: '\u200B', inline: false },
            { name: `📍 Contract Address`, value: `\`\`\`${data.contractAddress}\`\`\``, inline: false },
            { name: 'Twitter Link', value: data.twitterLink || 'None', inline: true },
            { name: 'Telegram Link', value: data.telegramLink || 'None', inline: true },
            { name: 'Website Link', value: data.websiteLink || 'None', inline: true },
            { name: 'Other URLs', value: data.extractedUrls.length > 0 ? data.extractedUrls.join('\n') : 'None', inline: false },
            {
                name: "🛠️ Contract Deployer", 
                value: `[${await formatAddress(data.contractCreator)}](https://etherscan.io/address/${data.contractCreator})`, 
                inline: true
            },
            { name: 'ETH Balance', value: `${data.deployerBalance} ETH`, inline: true },
            { name: '\u200B', value: '\u200B', inline: true }
        );

    if (data.previousContracts.length > 0) {
        embed.addFields(
            { name: "Previous Contracts", value: formattedPreviousContracts.join('\n'), inline: true },
            { name: '\u200B', value: '\u200B', inline: true},
            { 
                name: "Deployment Times", 
                value: data.previousContracts.slice(0, 3).map(contract => `<t:${Math.floor(contract.deploymentTimestamp / 1000)}:R>`).join('\n'), 
                inline: true 
            }
        );
    }

    embed.addFields(
        { name: "💰 Funding Sources", value: fundingSourcesDisplay, inline: true },
        { name: 'ETH Amount', value: ethAmounts, inline: true },
        { name: 'Time', value: times, inline: true },
        { 
            name: "🔗 Links", 
            value: `[Dextools](https://www.dextools.io/app/en/ether/pair-explorer/${data.contractAddress}) | [Dexscreener](https://dexscreener.com/ethereum/${data.contractAddress}) | [DexSpy](https://dexspy.io/eth/token/${data.contractAddress})\n[Maestro](https://t.me/MaestroSniperBot?start=${data.contractAddress}) | [Banana](https://t.me/BananaGunSniper_bot?start=ref_Unchained_${data.contractAddress}) | [Shuriken](https://t.me/ShurikenTradeBot?start=qt-inworkwetrust-${data.contractAddress}) | [OttoSim](https://t.me/OttoSimBot?start=${data.contractAddress})`, 
            inline: false 
        }
    )
    .setTimestamp()
    .setFooter({ text: "Unchained", iconURL: "https://cdn.discordapp.com/attachments/888244235407605800/1080223489224626308/UNCHAINED_AGENCY_LOGO_TWITTER_PROFILE_PICTURE_CIRCLE.png" });

    // Send the embed to the specified channel
    try {
        const config = loadConfig();
        if (config && config.verifiedContractChannel) {
            for (const channelId of config.verifiedContractChannel) {
                const channel = discord.channels.cache.get(channelId);
                if (channel) {
                    await channel.send({ embeds: [embed] });
                } else {
                    console.error(`Channel not found: ${channelId}`);
                }
            }
        }
    } catch (error) {
        console.error('Error sending message to Discord:', error);
    }
}
function formatLockPercent(lockPercent, lockUnixTimestamp) {
    // Convert decimal to percentage
    const percentage = (lockPercent * 100).toFixed(2); // Rounds to 2 decimal places

    // Determine the color of the bubble
    let colorBubble;
    if (percentage >= 80) {
        colorBubble = '🟢'; // Green bubble for 80-100%
    } else if (percentage >= 50 && percentage < 80) {
        colorBubble = '🟡'; // Yellow bubble for 50-79%
    } else {
        colorBubble = '🔴'; // Red bubble for below 50%
    }

    if (lockUnixTimestamp == "Burned"){
        colorBubble = '🔥'; // Fire if burned

    }


    return `${colorBubble} ${percentage}%`;
}

function generateLinks(data) {
    let links = [
        `[Dextools](https://www.dextools.io/app/en/ether/pair-explorer/${data.contractAddress})`,
        `[Dexscreener](https://dexscreener.com/ethereum/${data.contractAddress})`,
        `[DexSpy](https://dexspy.io/eth/token/${data.contractAddress})`,
        `[Maestro](https://t.me/MaestroSniperBot?start=${data.contractAddress})`,
        `[Banana](https://t.me/BananaGunSniper_bot?start=ref_Unchained_${data.contractAddress})`,
        `[Shuriken](https://t.me/ShurikenTradeBot?start=qt-inworkwetrust-${data.contractAddress})`,
        `[OttoSim](https://t.me/OttoSimBot?start=${data.contractAddress})`
    ];
        // Add additional links if available
        if (data.telegramLink && data.telegramLink !== 'None') {
            links.push(`[Telegram](${data.telegramLink})`);
        }
        if (data.twitterLink && data.twitterLink !== 'None') {
            links.push(`[Twitter](${data.twitterLink})`);
        }
        if (data.websiteLink && data.websiteLink !== 'None') {
            links.push(`[Website](${data.websiteLink})`);
        }
    
        return links.join(' | ');
}
function generateBaseLinks(data) {
        let links = [
            `[Dextools](https://www.dextools.io/app/en/base/pair-explorer/${data.contractAddress})`,
            `[Dexscreener](https://dexscreener.com/base/${data.contractAddress})`,
            `[DexSpy](https://dexspy.io/base/token/${data.contractAddress})`,
            `[Maestro](https://t.me/MaestroSniperBot?start=${data.contractAddress})`,
            `[Banana](https://t.me/BananaGunSniper_bot?start=ref_Unchained_${data.contractAddress})`,
            `[Shuriken](https://t.me/ShurikenTradeBot?start=qt-inworkwetrust-${data.contractAddress})`,
            `[OttoSim](https://t.me/OttoSimBot?start=${data.contractAddress})`
    ];

    // Add additional links if available
    if (data.telegramLink && data.telegramLink !== 'None') {
        links.push(`[Telegram](${data.telegramLink})`);
    }
    if (data.twitterLink && data.twitterLink !== 'None') {
        links.push(`[Twitter](${data.twitterLink})`);
    }
    if (data.websiteLink && data.websiteLink !== 'None') {
        links.push(`[Website](${data.websiteLink})`);
    }

    return links.join(' | ');
}

module.exports = { editSettingsEmbed, updateIntegerRequiredInputEmbed, updateSettingChangedEmbed, sendContractDeployedEmbeds, sendVerifiedEmbed, sendUnicryptEmbeds, sendBaseContractDeployedEmbeds };