const axios = require('axios');
const fs = require('fs');
const tokenContractAddress = '0x6982508145454ce325ddbe47a25d4ec3d2311933'; // Replace with the token contract address
let currentKeyIndex = 0;
let apiKeys = [];
const cacheFilePath = 'data/lp-tokens.json';

async function readCache() {
  if (!fs.existsSync(cacheFilePath)) {
      return {};
  }
  const data = fs.readFileSync(cacheFilePath);
  return JSON.parse(data);
}

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

async function parseTransferEventData(logs) {
  let poolAddress = '';
  let recipients = new Map(); // Using a Map to track address and accumulated amount

  for (const log of logs) {
      const sender = '0x' + log.topics[1].slice(26);

      if (!poolAddress && await isUniswapLiquidityPool(sender)) {
          poolAddress = sender;
      }

      if (sender === poolAddress) {
          const receiver = '0x' + log.topics[2].slice(26);
          const amount = parseInt(log.data, 16); // Assuming log.data contains the transferred amount

          if (recipients.has(receiver)) {
              recipients.set(receiver, recipients.get(receiver) + amount);
          } else if (recipients.size < 50) {
              recipients.set(receiver, amount);
          }
      }
  }

  if (poolAddress) {
      console.log(`Liquidity Pool Address: ${poolAddress}`);
      console.log(`First 50 Recipients and Amounts from the Pool:`);
      recipients.forEach((amount, address) => {
          console.log(`${address}: ${amount}`);
      });
  } else {
      console.log('No liquidity pool address found in the given logs.');
  }
}

async function isUniswapLiquidityPool(contractAddress) {
  const apiKey = getRotatingApiKey(); // Use rotating API key
  let cache = await readCache();

  // Check cache first
  if (cache[contractAddress] !== undefined) {
      return cache[contractAddress];
  }

  console.log("Using API Key: " + apiKey);
  const url = `https://api.etherscan.io/api?module=contract&action=getabi&address=${contractAddress}&apikey=${apiKey}`;

  try {
      const response = await axios.get(url);

      if (response.status === 200 && response.data.status === '1') {
          const abi = JSON.parse(response.data.result);

          // Check for specific functions that are common in Uniswap pool contracts
          const isPool = abi.some(item => 
              item.type === 'function' && 
              (item.name === 'token0' || item.name === 'token1' || item.name === 'getReserves')
          );

          // Update the cache
          return isPool;
      } else {
          console.error(`Failed to fetch ABI for ${contractAddress}:`, response.data.message);
          return false;
      }
  } catch (error) {
      console.error("Error in isUniswapLiquidityPool:", error);
      return false;
  }
}

async function getAndParseTransferEvents() {

  let apiKey = getRotatingApiKey();
  try {
      const response = await axios.get('https://api.etherscan.io/api', {
          params: {
              module: 'logs',
              action: 'getLogs',
              fromBlock: 0,
              toBlock: 'latest',
              address: tokenContractAddress,
              topic0: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
              apikey: apiKey,
              page: 1,
              offset: 1000
          }
      });

      if (response.data && response.data.result) {
          parseTransferEventData(response.data.result);
      } else {
          console.error('No data found or error in response');
      }
  } catch (error) {
      console.error('Error fetching data from Etherscan:', error);
  }
}

getAndParseTransferEvents();