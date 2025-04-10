const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const ethers = require('ethers'); // Make sure to have ethers.js installed
const axios = require('axios');
const cheerio = require('cheerio');
const batchSize = 50;
const provider = new ethers.providers.JsonRpcProvider(process.env.ETH_RPC_URL);

const fs = require('fs');
let configData = {}; // Store the config data in memory

// Load the config file when the program starts
try {
  configData = JSON.parse(fs.readFileSync('channelSettings.json', 'utf-8'));
} catch (error) {
  console.error('Error reading or parsing config file:', error);
}

function isUserOnWhitelist(userId, whitelistKey) {
  const whitelist = configData[whitelistKey] || [];

  return whitelist.includes(userId);
}

async function getTokenDetailsOrString(input) {
  // Define a regex pattern to remove non-URL-friendly characters
  const removeNonUrlFriendlyPattern = /[^a-zA-Z0-9-_]/g;

  // Check if input is a contract address (starts with 0x and is 42 characters long)
  if (/^0x[a-fA-F0-9]{40}$/.test(input)) {
      try {
          // Define the ERC-20 contract ABI
          const erc20Abi = [
              "function name() view returns (string)",
              "function symbol() view returns (string)"
          ];

          // Create a contract instance
          const contract = new ethers.Contract(input, erc20Abi, provider);

          // Fetch the name and symbol
          let name = await contract.name();
          let symbol = await contract.symbol();

          // Remove non-URL-friendly characters
          name = name.replace(removeNonUrlFriendlyPattern, '');
          symbol = symbol.replace(removeNonUrlFriendlyPattern, '');

          // Create an array to hold valid entries
          const validEntries = [];
          if (name !== '') validEntries.push(name);
          if (symbol !== '') validEntries.push(symbol);

          return validEntries;
      } catch (error) {
          console.error('Error fetching token details:', error);
          return [];
      }
  } else {
      // If it's not a contract address, return the input string after filtering
      const filteredInput = input.replace(removeNonUrlFriendlyPattern, '');
      return filteredInput === '' ? [] : [filteredInput];
  }
}


async function checkWebsitesConcurrently(websites) {
  const reachableWebsites = [];

  for (let i = 0; i < websites.length; i += batchSize) {
    const batch = websites.slice(i, i + batchSize);

    const batchPromises = batch.map(async (website) => {
      try {
        await axios.get(website, { timeout: 8000 });
        reachableWebsites.push(website);
      } catch (error) {
        // Handle errors or do nothing if you don't want to track failed requests
      }
    });

    await Promise.all(batchPromises);
    await new Promise((resolve) => setTimeout(resolve, 8000));
  }

  return reachableWebsites;
}

function generateCombinations(words, prefixes, suffixes, extensions) {
  const combinations = [];

  for (const word of words) {
    for (const prefix of prefixes) {
      for (const suffix of suffixes) {
        for (const extension of extensions) {
          const combination = `${prefix}${word}${suffix}.${extension}`;
          combinations.push(`https://${combination}`);
        }
      }
    }
  }

  return Array.from(new Set(combinations));
}
function generateTelegramCombinations(words, prefixes, suffixes) {
  const usernames = [];

  for (const word of words) {
    for (const prefix of prefixes) {
      for (const suffix of suffixes) {
        const username = `https://t.me/${prefix}${word}${suffix}`;
        usernames.push(username);
      }
    }
  }

  return Array.from(new Set(usernames));
}
function generateTwitterCombinations(words, prefixes, suffixes) {
  const usernames = [];

  for (const word of words) {
    for (const prefix of prefixes) {
      for (const suffix of suffixes) {
        const username = `https://x.com/${prefix}${word}${suffix}`;
        usernames.push(username);
      }
    }
  }

  return Array.from(new Set(usernames));
}


async function checkForWebsites(word, interaction) {
  const prefixes = ["", "www."];
  const suffixes = ["", "coin", "erc", "oneth", "token"];
  const extensions = ["com", "org", "net", "finance", "vip", "io", "gg", "tech", "meme", "xyz"];

  const websiteCombinations = generateCombinations(word, prefixes, suffixes, extensions); // Generates an array of possible URLs.

  try {
    const reachableWebsites = await checkWebsitesConcurrently(websiteCombinations);

    sendWebsitesEmbeds(interaction, reachableWebsites)

    //console.log('Reachable Websites:');

    //console.log(reachableWebsites);

  } catch (error) {
    console.error('Error:', error);
  }
}

async function sendWebsitesEmbeds(interaction, websites) {
    const websitesPerPage = 20;

    if (websites.length === 0) {
        // Send an embed with "No Websites Found"
        const embed = new EmbedBuilder()
            .setTitle("Websites List")
            .setColor('#ff045f')
            .setTimestamp()
            .setFooter({ text: "Unchained", iconURL: "https://cdn.discordapp.com/attachments/888244235407605800/1080223489224626308/UNCHAINED_AGENCY_LOGO_TWITTER_PROFILE_PICTURE_CIRCLE.png" })
            .addFields({ name: 'Websites', value: 'No Websites Found' });

        await interaction.channel.send({ embeds: [embed] });
        return;
    }

    const totalEmbeds = Math.ceil(websites.length / websitesPerPage);

    for (let page = 0; page < totalEmbeds; page++) {
        const startIndex = page * websitesPerPage;
        const endIndex = Math.min((page + 1) * websitesPerPage, websites.length);
        const pageWebsites = websites.slice(startIndex, endIndex);

        const embed = new EmbedBuilder()
            .setTitle("Websites List")
            .setColor('#ff045f')
            .setTimestamp()
            .setFooter({ text: "Unchained", iconURL: "https://cdn.discordapp.com/attachments/888244235407605800/1080223489224626308/UNCHAINED_AGENCY_LOGO_TWITTER_PROFILE_PICTURE_CIRCLE.png" });

        let websiteString = pageWebsites.join('\n');
        embed.addFields({ name: 'Websites', value: websiteString });

        await interaction.channel.send({ embeds: [embed] });
    }
}


async function sendTelegramEmbeds(interaction, websites) {
    const websitesPerPage = 20;

    if (websites.length === 0) {
        // Send an embed with "No Telegrams Found"
        const embed = new EmbedBuilder()
            .setTitle("Telegram List")
            .setColor('#ff045f')
            .setTimestamp()
            .setFooter({ text: "Unchained", iconURL: "https://cdn.discordapp.com/attachments/888244235407605800/1080223489224626308/UNCHAINED_AGENCY_LOGO_TWITTER_PROFILE_PICTURE_CIRCLE.png" })
            .addFields({ name: 'Telegrams', value: 'No Telegrams Found' });

        await interaction.channel.send({ embeds: [embed] });
        return;
    }

    const totalEmbeds = Math.ceil(websites.length / websitesPerPage);

    for (let page = 0; page < totalEmbeds; page++) {
        const startIndex = page * websitesPerPage;
        const endIndex = Math.min((page + 1) * websitesPerPage, websites.length);
        const pageWebsites = websites.slice(startIndex, endIndex);

        const embed = new EmbedBuilder()
            .setTitle("Telegram List")
            .setColor('#ff045f')
            .setTimestamp()
            .setFooter({ text: "Unchained", iconURL: "https://cdn.discordapp.com/attachments/888244235407605800/1080223489224626308/UNCHAINED_AGENCY_LOGO_TWITTER_PROFILE_PICTURE_CIRCLE.png" });

        let websiteString = pageWebsites.join('\n');
        embed.addFields({ name: 'Telegrams', value: websiteString });

        await interaction.channel.send({ embeds: [embed] });
    }
}


async function findRealTwitters(usernames) {
  const realUsernames = [];
  const fakeUsernames = [];

  for (const username of usernames) {
    try {
      // Send a request to Twitter's API to check if the username exists
      const response = await axios.get(`https://api.twitter.com/2/users/by/username/${username}`, {
        headers: {
          Authorization: 'Bearer AAAAAAAAAAAAAAAAAAAAAO0yqQEAAAAAPJnLoBOLVpcKyt7tS8mS4McHEVY%3Dd0wNSIUM1LVtqxCnwXAyKrZ7iv80s0xTjbxFcXv15KThsaeMha',
        },
      });

      console.log(response.data)
      // Check if the response status code is 200 (indicating a real username)
      if (response.status === 200) {
        realUsernames.push(username);
      } else {
        fakeUsernames.push(username);
      }
    } catch (error) {
      // If there is an error (e.g., 404 Not Found), it's likely a fake username
      console.log(error)
      fakeUsernames.push(username);
    }
  }

  return { realUsernames, fakeUsernames };
}


async function findRealTelegramChannels(urls) {
  const elementSelector = 'body > div.tgme_page_wrap > div.tgme_body_wrap > div > div.tgme_page_description';
  const realChannels = [];

  // Split the URLs into batches of 50
  for (let i = 0; i < urls.length; i += 50) {
    const batch = urls.slice(i, i + 50);

    // Process each URL in the batch concurrently
    const batchPromises = batch.map(async (url) => {
      try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        const element = $(elementSelector);

        if (element.length > 0) {
          const elementText = element.text().trim();

          if (elementText && !(elementText.includes('If you have Telegram, you can contact'))) {
            // Add the URL to the realChannels array
            realChannels.push(url);
          }
        }
      } catch (error) {
        console.error(`Error checking ${url}: ${error.message}`);
      }
    });

    // Wait for all URLs in the batch to be processed
    await Promise.all(batchPromises);
  }

  return realChannels;
}


async function checkForTelegrams(word, interaction) {

  const prefixes = ["", "user", "portal", "guard", "protocol", "Security", "community", "token", "official", "network", "entry"];
  const suffixes = ["", "_guard", "_bot", "_channel", "_portal", "portal", "_coin", "coin", "_erc", "erc", "_universe", "_eth", "protocol", "_protocol", "_security", "_community", "_token"];  

  const telegramCombinations = await generateTelegramCombinations(word, prefixes, suffixes);

  const realTelegrams = await findRealTelegramChannels(telegramCombinations)

  sendTelegramEmbeds(interaction, realTelegrams)

}

async function checkForTwitters(word) {

  const prefixes = ["", "coin", "erc", "eth"];
  const suffixes = ["", "coin", "coineth", "eth", "erc", "community", "_community", "_coin", "coin", "_erc", "erc"];

  const twitterCombinations = await generateTwitterCombinations(word, prefixes, suffixes);

  console.log(twitterCombinations)

  const realTwitters = await findRealTwitters(['pepe', 'opeoesfnisebnfiuse'])

  console.log(realTwitters)

}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('findsocials')
    .setDescription('Find Socials Early!')
    .addStringOption(option =>
      option.setName('input')
        .setDescription('Enter a word or a contract address')
        .setRequired(true)), // This makes the option required
  async execute(interaction) {
    const input = interaction.options.getString('input');
    console.log(`${interaction.user.username} used findEarlysocials for "${input}"`);

    try {

    const whitelistKeyToCheck = 'earlySocialsWhitelist'; // Replace with the desired whitelist key

    if (!isUserOnWhitelist(interaction.user.id, whitelistKeyToCheck)) {
      return interaction.followUp(`You must be whitelisted to use this feature!`);
      
    }

    let prompt = await getTokenDetailsOrString(input)

    console.log(prompt)

    checkForWebsites(prompt, interaction);
    checkForTelegrams(prompt, interaction)

     interaction.followUp(`Starting search for ${input}`);
    } catch (e) {
    
    console.log("ERROR IN EARLYSOCIALS")
    }

    return;
  },
};
