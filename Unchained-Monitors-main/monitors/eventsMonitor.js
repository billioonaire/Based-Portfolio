// contractMonitor.js
const monitorFunctions = require("../monitorFunctions.js");

const { ethers, providers, Contract } = require('ethers');
const provider = new providers.JsonRpcProvider('YOUR_ETH_NODE_URL'); // don't use websocket for this connection, not working with websockets on infura

const axios = require('axios');

const ERC20_ABI = require("../abi/ERC20.json");
const UNISWAPV2POOL_ABI = require("../abi/UniswapV2Pool.json");
const WETH_ADDRESS = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const ETHERSCAN_API_KEY = 'YOUR_ETHERSCAN_API_KEY';

const fs = require('fs');
const cacheFilePath = 'data/lp-tokens.json';

let apiKeys = [];

function loadApiKeys(filePath) {
    // API keys should be loaded from environment variables or secure storage
    apiKeys = ['YOUR_API_KEY'];
}

function getRotatingApiKey() {
    if (apiKeys.length === 0) {
        loadApiKeys();
    }
    return apiKeys[0];
}

// Function to read cache
async function readCache() {
    if (!fs.existsSync(cacheFilePath)) {
        return {};
    }
    const data = fs.readFileSync(cacheFilePath);
    return JSON.parse(data);
}

// Function to write to cache
async function writeCache(cache) {
    fs.writeFileSync(cacheFilePath, JSON.stringify(cache, null, 2));
}

async function getCurrentBlockNumber() {

    const url = `https://api.etherscan.io/api?module=proxy&action=eth_blockNumber&apikey=${ETHERSCAN_API_KEY}`;
    try {
        const response = await axios.get(url);
        const currentBlock = parseInt(response.data.result, 16);
        //console.log("Current Block Number from Etherscan:", currentBlock);
        return currentBlock;
    } catch (error) {
        console.error('Error fetching current block number:', error);
        return null;
    }
}

async function fetchLogsByTopics(fromBlock, toBlock, topics) {
    const url = `https://api.etherscan.io/api?module=logs&action=getLogs&fromBlock=${fromBlock}&toBlock=${toBlock}&topic0=${topics[0]}&apikey=${ETHERSCAN_API_KEY}`;
    try {
        const response = await axios.get(url);
        if (response.data && Array.isArray(response.data.result)) {
            return response.data.result;
        } else {
            console.error('Unexpected response structure:', response.data);
            return [];
        }
    } catch (error) {
        console.error('Error fetching logs:', error);
        return [];
    }
}

const UNCHAINED_EVENTS = 'YOUR_DISCORD_WEBHOOK_URL';

async function startEventsMonitor(discordClient) {
    console.log("Starting Event Monitor");

    let lastCheckedBlock = await getCurrentBlockNumber();
    setInterval(async () => {
        
        let currentBlock = await getCurrentBlockNumber();

        if (currentBlock == lastCheckedBlock) return;
        
        lastCheckedBlock = currentBlock; // Update the last checked block

        const topics = ['0xeb65d0f36862bbd8763c5e2c983c9d753267d223eee35a224d8d0a9d7ef433a2', '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef','0x830357565da6ecfc26d8d9f69df488ed6f70361af9a07e570544aeb5c5e765e5','0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925']; // Add more topics as needed
        const logs = await fetchLogsByTopics('latest', 'latest', topics);
        
        
        console.log("Checking "+ logs.length +" Logs of Block #"+currentBlock);

        if (logs.length > 0) {
            logs.forEach(async(log) => {
                try {
                    if (log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
                        let from = log.topics[1];
                        let to = log.topics[2];
                        if (to.toLowerCase() == '0x000000000000000000000000000000000000000000000000000000000000dead' || to == '0x0000000000000000000000000000000000000000000000000000000000000000') {
                            const contractAddress = log.address;


                            let isLP = await isUniswapLiquidityPool(contractAddress)
                            
                            if (isLP) {                                

                                let pair = await getPair(contractAddress); // Getting the details of the tokens in the LP pair.
                                // Setting whichever token isn't weth to newToken.

                                let lockInfo = parseERC20TransferEvent(log)

                                console.log(lockInfo)
                                

                                let newToken;
                                let lockedWETH;
                                if (pair.token0.toLowerCase() == WETH_ADDRESS) { // Setting newToken to be the newToken's address.
                                  newToken = await getErc20TokenDetails(pair.token1, contractAddress);
                                  lockedWETH = pair.reserves._reserve0; // Setting the amount of WETH that is in the liquidity pool.
                                } else if (pair.token1.toLowerCase() == WETH_ADDRESS) {
                                  newToken = await getErc20TokenDetails(pair.token0, contractAddress);
                                  lockedWETH = pair.reserves._reserve1; // Setting the amount of WETH that is in the liquidity pool.
                                } else {
                                    newToken = await getErc20TokenDetails(pair.token0, contractAddress);
                                }
                                let percentageLocked = lockInfo.amount / pair.totalSupply; // The amount of LP token locked in unicrypt.
                                lockedWETH = lockedWETH / 1000000000 / 1000000000 * percentageLocked; // Setting the amount of ETH that was locked in unicrypt.
                                
                                console.log(percentageLocked)

                                if(!(percentageLocked > .50 && percentageLocked <= 1)) return false;

                                let tokenInfo = {
                                    name: newToken.name,
                                    symbol: newToken.symbol
                                }
                                monitorFunctions.runUnicryptChecks(contractAddress, percentageLocked, "Burned", tokenInfo, discordClient);

                                console.log("I MADE IT")
                            }



                        }
                    }else if (log.topics[0] === '0xeb65d0f36862bbd8763c5e2c983c9d753267d223eee35a224d8d0a9d7ef433a2') {

                        let lockInfo = parseTeamFinance(log);
                        console.log(lockInfo);

                        let isLP = await isUniswapLiquidityPool(lockInfo.tokenAddress)
                            console.log(isLP);
                        if (isLP) {

                        let pairAddress = lockInfo.tokenAddress;

                        let pair = await getPair(pairAddress); // Getting the details of the tokens in the LP pair.
                        // Setting whichever token isn't weth to newToken.
                        let newToken;
                        let lockedWETH;
                        if (pair.token0.toLowerCase() == WETH_ADDRESS) { // Setting newToken to be the newToken's address.
                          newToken = await getErc20TokenDetails(pair.token1, pairAddress);
                          lockedWETH = pair.reserves._reserve0; // Setting the amount of WETH that is in the liquidity pool.
                        } else if (pair.token1.toLowerCase() == WETH_ADDRESS) {
                          newToken = await getErc20TokenDetails(pair.token0, pairAddress);
                          lockedWETH = pair.reserves._reserve1; // Setting the amount of WETH that is in the liquidity pool.
                        } else {
                            newToken = await getErc20TokenDetails(pair.token0, pairAddress);
                        }
                        let percentageLocked = lockInfo.amount / pair.totalSupply; // The amount of LP token locked in unicrypt.
                        lockedWETH = lockedWETH / 1000000000 / 1000000000 * percentageLocked; // Setting the amount of ETH that was locked in unicrypt.

                        let tokenInfo = {
                            name: newToken.name,
                            symbol: newToken.symbol
                        }

                        monitorFunctions.runUnicryptChecks(newToken.address, percentageLocked, lockInfo.unlockTime, tokenInfo, discordClient);
                    }

                    } else if (log.topics[0] === '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925') {
                        let lockInfo = parseLPLockData(log.data);
                        let pairAddress = lockInfo.lpToken;

                        let pair = await getPair(pairAddress); // Getting the details of the tokens in the LP pair.
                        // Setting whichever token isn't weth to newToken.
                        let newToken;
                        let lockedWETH;
                        if (pair.token0.toLowerCase() == WETH_ADDRESS) { // Setting newToken to be the newToken's address.
                          newToken = await getErc20TokenDetails(pair.token1, pairAddress);
                          lockedWETH = pair.reserves._reserve0; // Setting the amount of WETH that is in the liquidity pool.
                        } else if (pair.token1.toLowerCase() == WETH_ADDRESS) {
                          newToken = await getErc20TokenDetails(pair.token0, pairAddress);
                          lockedWETH = pair.reserves._reserve1; // Setting the amount of WETH that is in the liquidity pool.
                        } else {
                            newToken = await getErc20TokenDetails(pair.token0, pairAddress);
                        }
                        let percentageLocked = lockInfo.amount / pair.totalSupply; // The amount of LP token locked in unicrypt.
                        lockedWETH = lockedWETH / 1000000000 / 1000000000 * percentageLocked; // Setting the amount of ETH that was locked in unicrypt.

                        let tokenInfo = {
                            name: newToken.name,
                            symbol: newToken.symbol
                        }

                        monitorFunctions.runUnicryptChecks(newToken.address, percentageLocked, lockInfo.unlockDate, tokenInfo, discordClient);

                    } else if (log.topics[0] ==`0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925`){
                        console.log(log)
                    }
                } catch (e) {
                    console.log(e);
                }
            });
            console.log('Fetched block ', lastCheckedBlock, " successfully!");
        }
    }, 2000); // once per second
}

function parseERC20TransferEvent(log) {
    // Helper function to parse an Ethereum address from a topic
    const parseAddressFromTopic = (topic) => '0x' + topic.slice(26);

    // Helper function to parse a uint256 from data
    const parseUint256 = (data) => BigInt(data).toString();

    // Extract addresses from topics
    const fromAddress = parseAddressFromTopic(log.topics[1]);
    const toAddress = parseAddressFromTopic(log.topics[2]);

    // Extract the value transferred from the data field
    const amount = parseUint256(log.data);

    return {
        fromAddress,
        toAddress,
        amount
    };
}

function parseTeamFinance(log) {
    // Helper function to parse an Ethereum address from a topic
    const parseAddressFromTopic = (topic) => '0x' + topic.slice(26);

    // Helper function to parse a uint256 from data
    const parseUint256 = (data) => BigInt('0x' + data).toString();

    // Extract addresses from topics
    const tokenAddress = parseAddressFromTopic(log.topics[1]);
    const withdrawalAddress = parseAddressFromTopic(log.topics[2]);

    // Extract data fields - assuming each is a uint256
    const id = parseUint256(log.data.slice(2, 66));
    const amount = parseUint256(log.data.slice(66, 130));
    const unlockTime = parseUint256(log.data.slice(130));

    return {
        tokenAddress,
        withdrawalAddress,
        id,
        amount,
        unlockTime
    };
}

function parseLPLockData(data) {
    // Helper function to parse an Ethereum address from data
    const parseAddress = (data) => '0x' + data.slice(-40);

    // Helper function to parse a uint256 from data
    const parseUint256 = (data) => BigInt('0x' + data).toString();

    // Extracting the variables from the data
    // Each segment is 64 characters (32 bytes) long. For addresses, slice the last 40 characters.
    const lpToken = parseAddress(data.slice(2, 66));
    const user = parseAddress(data.slice(66, 130));
    const amount = parseUint256(data.slice(130, 194));
    const lockDate = parseInt(data.slice(194, 258), 16);
    const unlockDate = parseInt(data.slice(258, 322), 16);

    // Returning an object with all the parsed values
    return {
        lpToken,
        user,
        amount,
        lockDate,
        unlockDate
    };
}

async function isUniswapLiquidityPool(contractAddress) {
    const apiKey = getRotatingApiKey(); // Replace with your Etherscan API key
    let cache = await readCache();

    // Check cache first
    if (cache[contractAddress] !== undefined) {
        return cache[contractAddress];
    }
    console.log("USING " + apiKey)
    const url = `https://api.etherscan.io/api?module=contract&action=getabi&address=${contractAddress}&apikey=${apiKey}`;
    try {
        const response = await axios.get(url);

        console.log(response.status)
        console.log(response.data.message)
        const abi = JSON.parse(response.data.result);

        // Check for specific functions that are common in Uniswap pool contracts
        const isPool = abi.some(item => 
            item.type === 'function' && 
            (item.name === 'token0' || item.name === 'token1' || item.name === 'getReserves')
        );

        // Update the cache
        cache[contractAddress] = isPool;
        await writeCache(cache);
        return isPool;
    } catch (error) {
        console.error("Error:", error);
        return false;
    }
}

async function getPair(tokenAddress) {

    const pairContract = new ethers.Contract(tokenAddress, UNISWAPV2POOL_ABI, provider);

    const token0 = await pairContract.token0();
    const token1 = await pairContract.token1();
    const totalSupply = await pairContract.totalSupply();
    const reserves = await pairContract.getReserves();

    return {
        token0: token0,
        token1: token1,
        totalSupply: totalSupply.toString(),
        reserves: reserves
    }
    
}

async function getErc20TokenDetails(tokenAddress, pairAddress) {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

    const name = await tokenContract.name();
    const decimals = await tokenContract.decimals();
    const totalSupply = await tokenContract.totalSupply();
    const liquidityAmount = await tokenContract.balanceOf(pairAddress);
    const symbol = await tokenContract.symbol();

    return {
        name: name,
        decimals: decimals,
        totalSupply: totalSupply.toString(),
        liquidityAmount: liquidityAmount.toString(),
        symbol: symbol,
        address: tokenAddress
    }
}

module.exports = {
    startEventsMonitor,
};