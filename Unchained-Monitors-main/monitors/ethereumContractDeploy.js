// contractMonitor.js
const monitorFunctions = require("../monitorFunctions.js");

const { ethers, providers, Contract } = require('ethers');
const provider = new providers.JsonRpcProvider('https://mainnet.infura.io/v3/4798af18ca8244b78f03456b5d69823d'); // e.g., Infura, Alchemy, or a local node

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

module.exports = {
    startContractDeployMonitor,
};