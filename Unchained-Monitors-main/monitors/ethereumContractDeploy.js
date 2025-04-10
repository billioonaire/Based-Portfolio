// contractMonitor.js
const monitorFunctions = require("../monitorFunctions.js");

const { ethers, providers, Contract } = require('ethers');
const provider = new providers.JsonRpcProvider('YOUR_ETH_NODE_URL');

const UNCHAINED_ETH_DEPLOY = 'YOUR_DISCORD_WEBHOOK_URL';

// Function to monitor new contract deployments
async function startContractDeployMonitor(discordClient) {

    console.log("Starting Contract Deploy Monitor")

  provider.on('block', async (blockNumber) => {
    const block = await provider.getBlockWithTransactions(blockNumber);

    for (const tx of block.transactions) {
      if (!tx.to) {
        const receipt = await provider.getTransactionReceipt(tx.hash);

        if (receipt.contractAddress) {
          console.log('New Contract Deployed:', receipt.contractAddress);

            let contractAddress = receipt.contractAddress;            
                        
          monitorFunctions.runDeployedChecks(contractAddress, tx.from, discordClient)
          

        }
      }
    }
  });
}

async function sendContractDeployEmbed(data) {
    const UNCHAINED_CONTRACT_DEPLOY = 'YOUR_DISCORD_WEBHOOK_URL';
    // ... existing code ...
}

module.exports = {
    startContractDeployMonitor,
};