const axios = require('axios');

const ETHERSCAN_API_KEY = 'YourEtherscanApiKey'; // Replace with your Etherscan API key
const topic  = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925'; // Event topic hash
const fromBlock = 'latest'; // You can specify the starting block, e.g., 'latest' or a block number
const toBlock = 'latest'; // You can specify the ending block, e.g., 'latest' or a block number

function fetchLogsByTopics(fromBlock, toBlock, topic) {
  const url = `https://api.etherscan.io/api?module=logs&action=getLogs&fromBlock=${fromBlock}&toBlock=${toBlock}&topic0=${topic}&apikey=${ETHERSCAN_API_KEY}`;
  return axios.get(url)
    .then(response => {
      if (response.data && Array.isArray(response.data.result)) {
        return response.data.result;
      } else {
        console.error('Unexpected response structure:', response.data);
        return [];
      }
    })
    .catch(error => {
      console.error('Error fetching logs:', error);
      return [];
    });
}

async function checkForNewBlocksAndFetchLogs() {
  let currentBlock = await getCurrentBlockNumber();

  setInterval(async () => {
    const newBlock = await getCurrentBlockNumber();

    if (newBlock > currentBlock) {
      const logs = await fetchLogsByTopics(currentBlock + 1, newBlock, topic);

      if (logs.length > 0) {
        console.log('New logs found in block', newBlock);
        // Process the logs here
      }

      currentBlock = newBlock;
    }
  }, 5000); // Check every 5 seconds
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

checkForNewBlocksAndFetchLogs();