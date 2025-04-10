const Twit = require('twit');
const axios = require('axios-https-proxy-fix');
require("dotenv").config();
const ethers = require('ethers');
const fs = require('fs');
const puppeteer = require(`puppeteer`);

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

const openSeaFileContents = fs.readFileSync('openSeaAPIKeys.txt', 'utf-8'); // Read the file synchronously (you can use fs.promises.readFile for async)
const openSeaAPIKeysArray = openSeaFileContents.split(/\r?\n/).filter(key => key.trim() !== ''); // Split the contents into an array by newline character
function getRandomOSApiKey() { // Function to get a random API key from the file.
    if (openSeaAPIKeysArray.length === 0) {
        throw new Error("No API keys available.");
    }
    const randomIndex = Math.floor(Math.random() * openSeaAPIKeysArray.length);
    return openSeaAPIKeysArray[randomIndex];
}

const config = { // The config required for the twit library.
    consumer_key: process.env.TWITTERCONSUMERKEY,
    consumer_secret: process.env.TWITTERCONSUMERSECRET,
    access_token: process.env.TWITTERACCESSTOKEN,
    access_token_secret: process.env.TWITTERACCESSTOKENSECRET,
};
const twitClient = new Twit(config);

const proxyFileContents = fs.readFileSync(`./proxies.txt`, 'utf-8'); // Read the contents of the file
const proxiesArray = proxyFileContents.split('\n').map(line => line.trim()); // Split the proxies file into an array.
function getRandomProxy() { // Gets a random proxy from proxies.txt
    const validProxies = proxiesArray.filter(proxy => proxy !== ''); // Filter out any empty lines
    const randomIndex = Math.floor(Math.random() * validProxies.length); // Get a random index within the range of valid proxies
    return validProxies[randomIndex]; // Return a random proxy
}

const etherscanFileContents = fs.readFileSync('etherscanAPIKeys.txt', 'utf-8'); // Read the file synchronously (you can use fs.promises.readFile for async)
const etherscanAPIKeysArray = etherscanFileContents.split(/\r?\n/).filter(key => key.trim() !== ''); // Split the contents into an array by newline character
function getRandomEtherscanApiKey() { // Function to get a random API key from the file.
    if (etherscanAPIKeysArray.length === 0) {
        throw new Error("No API keys available.");
    }
    const randomIndex = Math.floor(Math.random() * etherscanAPIKeysArray.length);
    return etherscanAPIKeysArray[randomIndex];
}

async function getFastestResponse(request) { // Making 10 API calls per second while rotating proxies until a response is received
    let result;
    while (!result) {
        makeProxyRequest(getRandomProxy(), request).then(response => { // Making the API call with the proxy.
            if (!result)
                result = response;
        });
        await new Promise(resolve => setTimeout(resolve, 100)); // If no result has been received yet, wait 100ms before checking again.
    }
    return result;
}

async function makeProxyRequest(proxy, request) { // Making a axios request with the inputted proxy.
    const axiosInstance = axios.create({ // Creating an axios instance with the proxy and port inputted into the function.
        proxy: {
            host: proxy.split(`:`)[0],
            port: proxy.split(`:`)[1],
            auth: {
                username: proxy.split(`:`)[2],
                password: proxy.split(`:`)[3]
            }
        },
        headers: headers
    });
    return new Promise(async (resolve, reject) => {
        try {
            const response = await axiosInstance.get(request);
            resolve(response);
        } catch (error) {
            resolve(error);
        }
    });
}

async function kosettoAddressCall(walletAddress) {
    console.log(`Making kosetto address call for ${walletAddress}`)
    const response = await getFastestResponse(`https://prod-api.kosetto.com/users/${walletAddress}`);
    let registered = true;
    if (!response.status) { // If there was a response but the wallet address isn't registered on friend.tech (response.data = { message: 'Address/User not found.' });
        registered = false;
        return { registered }; // Returns an object with registered
    }
    const twitterDisplayName = response.data.twitterName;
    const PFPURL = response.data.twitterPfpUrl;
    const twitterHandle = response.data.twitterUsername;
    const keyCount = response.data.shareSupply;
    const keyHolders = response.data.holderCount;
    const keyPrice = roundToThreeSigFigs(response.data.displayPrice / 1000000000000000000);
    return {
        registered,
        twitterDisplayName,
        PFPURL,
        twitterHandle,
        keyCount,
        keyHolders,
        keyPrice,
        walletAddress
    };
}

async function kosettoHoldingsCall(walletAddress) {
    try {
        console.log(`Making kosetto holdings call for ${walletAddress}`)
        const response = await getFastestResponse(`https://prod-api.kosetto.com/users/${walletAddress}/token-holdings`);
        return response.data;
    } catch (error) {
        console.log(error);
        return null;
    }
}

async function kosettoHoldersCall(walletAddress) {
    try {
        console.log(`Making kosetto holders call for ${walletAddress}`)
        const response = await getFastestResponse(`https://prod-api.kosetto.com/users/${walletAddress}/token/holders`);
        return JSON.parse(JSON.stringify(response.data.users)); // Returning the users object parsed as a json.
    } catch (error) {
        console.log(error);
        return null;
    }
}

async function getTwitterInfo(twitterHandle) { // Returns an object that contains the twitter followers and bio of a handle.
    try {
        const response = await twitClient.get('users/show', { screen_name: twitterHandle });
        return {
            bio: response.data.description,
            followerCount: response.data.followers_count,
            PFPURL: response.data.profile_image_url_https,
            displayName: response.data.name,
            likeCount: response.data.favourites_count,
            tweetCount: response.data.statuses_count,
        };
    } catch (error) {
        console.log(`Error for finding twitter of ${twitterHandle}`);
        return null;
    }
}

async function getInfo(walletAddress) {
    try {
        // Making the kosetto call and then organizing the data.
        let kosettoData = await kosettoAddressCall(walletAddress);
        if (kosettoData == undefined) return; // Filters out bots signing up (signup with no friend.tech account)
        const twitterDisplayName = kosettoData.twitterDisplayName;
        const PFPURL = kosettoData.PFPURL;
        const twitterHandle = kosettoData.twitterHandle;
        const keyCount = kosettoData.keyCount;
        const keyHolders = kosettoData.keyHolders;
        const keyPrice = kosettoData.keyPrice;

        const result = await getTwitterInfo(twitterHandle);
        if (result == null) throw new Error(`Twitter not found for ${twitterHandle}`);

        const twitterBio = result.bio;
        const followerCount = result.followers;

        return {
            twitterDisplayName,
            followerCount,
            twitterBio,
            PFPURL,
            twitterHandle,
            keyCount,
            keyHolders,
            keyPrice,
            walletAddress
        };
    } catch (error) {
        if (error instanceof TypeError && error.message.includes("twitterName")) {
            console.error('Error: Kosetto cannot find this wallet address.');

        } else {
            console.error('Error:', error);
        }
        return null;
    }
};

async function getTwitterFromOpenSea(walletAddress) { // Getting the twitter account linked with OpenSea if it exists, otherwise returns null.
    const baseUrl = `https://api.opensea.io/api/v1/user/${walletAddress}/`;
    let rateLimited = true;
    while (rateLimited) {
        let openSeaAPIKey = getRandomOSApiKey();
        let options = {
            method: "GET",
            headers: {
                "X-API-KEY": openSeaAPIKey
            }
        };
        const response = await fetch(baseUrl, options);
        const data = await response.json();
        if (data && data.success === false) { // If the account doesn't exist on OpenSea.
            console.log(`${walletAddress} doesn't have an OpenSea Account.`);
            return null;
        }
        if (data.detail == undefined && data.success == undefined) {
            rateLimited = false;
            if (data.account.hasOwnProperty("twitter_username")) {
                if (data.account.twitter_username != undefined && data.account.twitter_username != null) { // If the wallet has a twitter linked on OpenSea
                    console.log(`${walletAddress} has the twitter ${data.twitter_username} on OS`);
                    return data.twitter_username;
                } else {
                    console.log(`${walletAddress} doesn't have a Twitter on OS`);
                    return null;
                }
            } else {
                console.log(`${walletAddress} doesn't have an account on OS`);
                return null;
            }
        } else {
            console.log(`Rate limited for ${walletAddress} using ${openSeaAPIKey}. Retrying in 2 seconds.`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2 seconds
        }
    }
}

function roundToThreeSigFigs(number) {
    if (number === 0) {
        return 0;
    }

    const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(number))) - 2);
    return Math.round(number / magnitude) * magnitude;
}

async function getTwitterFromDebank(walletAddress) { // Opens an insance of debank with puppeteer using a proxy and scraping the twitter handle off the page if it is there.
    try {
        let proxyServer = getRandomProxy(); // Getting a random proxy to call puppeteer with.
        const browser = await puppeteer.launch({
            //headless: false,
            headless: "new",
            args: [`--proxy-server=${proxyServer}`]
        });
        const page = await browser.newPage(); // Waiting for the browser to open.
        await page.goto(`https://debank.com/profile/${walletAddress}`); // Waiting for the browser to go to debank.
        await page.waitForSelector('div.db-user-tag.is-age'); // Waiting for the age tag element to load.
        console.log(`PAGE DONE LOADING.`)
        const pageSource = await page.content(); // Getting the pages source code.
        const match = pageSource.match(/https:\/\/www\.twitter\.com\/@([A-Za-z0-9_]+)/); // Find the first match of a twitter handle.
        if (match && match[1]) {
            const twitterHandle = match[1];
            console.log(`Successfully scraped ${walletAddress}'s twitter from debank: "${twitterHandle}"`);
            return twitterHandle;
        } else {
            console.log(`${walletAddress} has no twitter on debank.`);
        }
        await browser.close();
        return null;
    } catch (error) {
        console.log(error)
        return null;
    }
}

async function getContractInteractions(walletAddress, contractAddress) { // Returns the amount of times a user has interacted with a contract.
    const baseUrl = `https://api.etherscan.io/api?module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=99999999&sort=asc&apikey=`; // Getting tx history from etherscan
    let rateLimited = true;
    while (rateLimited) {
        let etherscanAPIKey = getRandomEtherscanApiKey();
        const response = await fetch(baseUrl + etherscanAPIKey);
        const data = await response.json();
        if (data.result == "Invalid API Key") {
            etherscanAPIKey = getRandomEtherscanApiKey();
            console.log(`Rate limited or broken API Key for ${walletAddress} using ${etherscanAPIKey}. Retrying in 2 seconds.`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2 seconds
        } else {
            let baseBridgeCount = 0;
            data.result.forEach(tx => {
                if (tx.to.toLowerCase() == contractAddress) { // If the transaction was sent to inputted contract.
                    baseBridgeCount++;
                }
            });
            return baseBridgeCount
        }
    }
}

module.exports = { getInfo, getTwitterFromOpenSea, getTwitterFromDebank, getTwitterInfo, getContractInteractions, kosettoHoldingsCall, kosettoAddressCall, kosettoHoldersCall };