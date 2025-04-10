// contractMonitor.js
const monitorFunctions = require("../monitorFunctions.js");

const { ethers, providers, Contract } = require('ethers');
const provider = new providers.JsonRpcProvider('https://base-mainnet.g.alchemy.com/v2/3jvxo1TC_IJ28e-SmuOULOlJJtzF6hCL'); // e.g., Infura, Alchemy, or a local node

// Function to monitor new contract deployments
async function startBaseContractDeployMonitor(discordClient) {

    console.log("Starting Base Contract Deploy Monitor")

  provider.on('block', async (blockNumber) => {
    const block = await provider.getBlockWithTransactions(blockNumber);
    //console.log(blockNumber)
    for (const tx of block.transactions) {
      if (!tx.to) {
        const receipt = await provider.getTransactionReceipt(tx.hash);

        if (receipt.contractAddress) {
          console.log('New Base Contract Deployed:', receipt.contractAddress);

            let contractAddress = receipt.contractAddress;            
                        
          monitorFunctions.runBaseDeployedChecks(contractAddress, tx.from, discordClient)
          

        }
      }
    }
  });
}

module.exports = {
    startBaseContractDeployMonitor,
};