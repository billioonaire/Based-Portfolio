const ethers = require('ethers');
require("dotenv").config();

async function getBalances(walletAddress, mainnetProvider, baseProvider) {
    let mainnetBalance = await mainnetProvider.getBalance(walletAddress);
    let baseBalance = await baseProvider.getBalance(walletAddress);
    return { mainnetBalance: Number(mainnetBalance), baseBalance: Number(baseBalance) };
}

async function getBaseBalance(walletAddress, baseProvider) {
    let baseBalance = await baseProvider.getBalance(walletAddress);
    baseBalance = ethers.utils.formatUnits(baseBalance, `ether`); // Converting wei to Ether
    return Number(baseBalance);
}

async function getMainnetBalance(walletAddress, mainnetProvider) {
    let mainnetBalance = await mainnetProvider.getBalance(walletAddress);
    mainnetBalance = ethers.utils.formatUnits(mainnetBalance, `ether`); // Converting wei to Ether
    return Number(mainnetBalance);
}

async function getFriendTechBotAddress(baseProvider, userAddress) {
    // Define the ABI for the specific function
    const abi = [
        "function friendTechBotMap(address) external view returns (address)"
    ];

    // Create a contract instance
    const contract = new ethers.Contract("0xF832D2d6b1bBc27381cE77166F4Ee9cF6cAA3819", abi, baseProvider);

    // Query the mapping
    const result = await contract.friendTechBotMap(userAddress);
    if (result == `0x0000000000000000000000000000000000000000`) return null;// will be 0x0000000000000000000000000000000000000000 if they do not have a contract deployed yet
    return result;
}

module.exports = { getBaseBalance, getFriendTechBotAddress };