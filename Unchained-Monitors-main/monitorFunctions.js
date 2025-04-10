var monitorFunctions = {};

const axios = require('axios');
const Twit = require('twit');
const fs = require('fs');
const { sendContractDeployedEmbeds, sendUnicryptEmbeds, sendBaseContractDeployedEmbeds, sendVerifiedEmbed  } = require(`./embedCreator.js`);

// Set up Twit with your Twitter API credentials
const T = new Twit({
  consumer_key: 'W8jdAoJCo0IPM5k5v2eK59W78',
  consumer_secret: '5furxMhnsbRAqCS5fvptc2Aoe30dF9Bw2Jro4SP6tVSTl2xzbP',
  access_token: '884324004487725056-KqkvoN5Podc4JH30I1anXbaKAOTJNZ8',
  access_token_secret: '',
});

let ETHERSCAN_API_KEY = 'PZ4WBTF5NB2VYIY11BZ6I2UKCZXYERZQ8W'; 
let BASE_API_KEY = 'DFF52Z996B3913E9934F6DKXPDJQCV5SPX';
let BASE_API_KEY2 = '4NEQ51R9NMGH8DTK36RYI57DNEZ8V28P3V';


const { ethers, providers, Contract } = require('ethers');

const provider = new ethers.providers.JsonRpcProvider(process.env.ETH_RPC_URL);
const baseProvider = new providers.JsonRpcProvider(''); // e.g., Infura, Alchemy, or a local node

const ERC20_ABI = [
    // Simplified ABI with only the functions we need
    {
        "constant": true,
        "inputs": [],
        "name": "name",
        "outputs": [{"name": "", "type": "string"}],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "symbol",
        "outputs": [{"name": "", "type": "string"}],
        "type": "function"
    }
];

let currentKeyIndex = 0;
let apiKeys = [];

function loadApiKeys(filePath) {
    apiKeys = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
}
loadApiKeys("./data/etherscanAPI.txt");
function getRotatingApiKey() {
    if (apiKeys.length === 0) {
        loadApiKeys(filePath); // Reload the keys from the file
    }

    const apiKey = apiKeys[currentKeyIndex];
    currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
    return apiKey;
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


const UNISWAP_ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

// Minimal ABI with only the 'swapExactETHForTokens' function
const uniswapRouterAbi = [
    {
        "constant": false,
        "inputs": [
            {"internalType": "uint256", "name": "amountOutMin", "type": "uint256"},
            {"internalType": "address[]", "name": "path", "type": "address[]"},
            {"internalType": "address", "name": "to", "type": "address"},
            {"internalType": "uint256", "name": "deadline", "type": "uint256"}
        ],
        "name": "swapExactETHForTokens",
        "outputs": [{"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"}],
        "payable": true,
        "stateMutability": "payable",
        "type": "function"
    }
];

async function isTokenLive(senderAddress, tokenContractAddress, ethAmount) {
    const TENDERLY_USER = "w00fy7";
    const TENDERLY_PROJECT = "project";
    const TENDERLY_ACCESS_KEY = "RRB6g6qVEwUaRmgs2erqyZusyuSW3S9y";

    const provider = new ethers.providers.JsonRpcProvider('https://mainnet.infura.io/v3/YOUR_INFURA_API_KEY');
    const uniswapRouterContract = new ethers.Contract(UNISWAP_ROUTER_ADDRESS, uniswapRouterAbi, provider);

    // Encode the function call
    const amountOutMin = ethers.utils.parseUnits('0.01', 18); // Example minimum amount of tokens to receive
    const path = ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', tokenContractAddress]; // ETH to ERC20 Token
    const deadline = Math.floor(Date.now() / 1000) + 5 * 24 * 60 * 60; // Current time + 5 days

    const inputData = uniswapRouterContract.interface.encodeFunctionData("swapExactETHForTokens", [
        amountOutMin,
        path,
        senderAddress,
        deadline
    ]);

    try {
        // Post request to Tenderly API
        const response = await axios.post(
            `https://api.tenderly.co/api/v1/account/${TENDERLY_USER}/project/${TENDERLY_PROJECT}/simulate`,
            {
                save: false,
                save_if_fails: false,
                simulation_type: "full",
                network_id: "1",
                from: senderAddress,
                input: inputData,
                to: UNISWAP_ROUTER_ADDRESS,
                value: ethers.utils.parseEther(ethAmount).toHexString(),
                access_list: [],
                generate_access_list: true,
            },
            {
                headers: {
                    "X-Access-Key": TENDERLY_ACCESS_KEY
                },
            }
        );

        // Check if the transaction was successful
        return response.data.transaction.status;

    } catch (error) {
        console.error('Error during simulation:', error.response ? error.response.data : error.message);
        return false;
    }
}

// Standard ABI for checking owner (assuming a function named 'owner' that returns the owner's address)
const ownableABI = [{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"type":"function"}];

async function isContractOwnable(contractAddress) {
    // Create contract instance with the standard ABI
    const contract = new ethers.Contract(contractAddress, ownableABI, provider);

    try {
        // Try to call the 'owner' function
        await contract.owner();
        return true; // If call succeeds, contract is ownable
    } catch (error) {
        return false; // If call fails, contract is not ownable
    }
}

async function checkContractRenounced(contractAddress) {
    // First check if the contract is ownable
    const ownable = await isContractOwnable(contractAddress);
    if (!ownable) {
        console.log("Contract is not ownable.");
        return false;
    }

    // Create contract instance with the standard ABI
    const contract = new ethers.Contract(contractAddress, ownableABI, provider);

    try {
        // Call the function that returns the owner's address
        const ownerAddress = await contract.owner();
        
        // Check if the owner's address is the zero address
        return ownerAddress === "0x0000000000000000000000000000000000000000";
    } catch (error) {
        console.error("Error checking contract renouncement: ", error);
        return false;
    }
}

async function checkBaseContractRenounced(contractAddress) {
    // First check if the contract is ownable
    const ownable = await isContractOwnable(contractAddress);
    if (!ownable) {
        console.log("Contract is not ownable.");
        return false;
    }

    // Create contract instance with the standard ABI
    const contract = new ethers.Contract(contractAddress, ownableABI, baseProvider);

    try {
        // Call the function that returns the owner's address
        const ownerAddress = await contract.owner();
        
        // Check if the owner's address is the zero address
        return ownerAddress === "0x0000000000000000000000000000000000000000";
    } catch (error) {
        console.error("Error checking contract renouncement: ", error);
        return false;
    }
}

async function unverifiedContractType(contractAddress) {
    const provider = new ethers.providers.JsonRpcProvider(process.env.INFURA_URL);
    
    const ERC20Interface = new ethers.utils.Interface([
        'function transfer(address,uint256) external returns (bool)',
        'function decimals() view returns (uint8)'
    ]);
    const ERC721Interface = new ethers.utils.Interface([
        'function ownerOf(uint256) view returns (address)'
    ]);
    const ERC1155Interface = new ethers.utils.Interface([
        'function balanceOf(address,uint256) view returns (uint256)'
    ]);
    
    const contract = new ethers.Contract(contractAddress, [
        ...ERC20Interface.fragments,
        ...ERC721Interface.fragments,
        ...ERC1155Interface.fragments
    ], provider);

    // Check for ERC-20 compatibility
    try {
        const decimals = await contract.decimals();
        if (decimals !== null) {
            return 'ERC-20';
        }
    } catch (error) {
        // Ignore as this means it's likely not an ERC-20
    }

    // Check for ERC-721 compatibility
    try {
        // We arbitrarily pick token ID 1 for ownerOf, as a heuristic check.
        await contract.ownerOf(1);
        return 'ERC-721';
    } catch (error) {
        // Ignore as this means it's likely not an ERC-721
    }

    // Check for ERC-1155 compatibility
    try {
        // We arbitrarily pick address(0) and token ID 1 for balanceOf, as a heuristic check.
        await contract.balanceOf('0x0000000000000000000000000000000000000000', 1);
        return 'ERC-1155';
    } catch (error) {
        // Ignore as this means it's likely not an ERC-1155
    }

    // If none of the checks succeeded
    return 'Other';
}


async function getContractDetails(contractAddress) {
    const contract = new Contract(contractAddress, ERC20_ABI, provider);
    let attempts = 0;
    const maxAttempts = 3; // Set a max number of retry attempts
    const retryDelay = 2000; // Delay between retries in milliseconds (2 seconds)

    while (attempts < maxAttempts) {
        try {
            const name = await contract.name();
            const symbol = await contract.symbol();
            return { name, symbol };
        } catch (error) {
            attempts++;
            console.log(`Attempt ${attempts} failed, retrying...`);

            if (error.code == "CALL_EXCEPTION") {
                return false
            }

            console.log(error.code +' for '+contractAddress)
            // Wait for the specified delay before retrying
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }

    // If all attempts fail, return false
    console.log('All attempts to fetch contract details failed.');
    return false;
}


async function getBaseContractDetails(contractAddress) {
    const contract = new Contract(contractAddress, ERC20_ABI, baseProvider);
    let attempts = 0;
    const maxAttempts = 3; // Set a max number of retry attempts
    const retryDelay = 2000; // Delay between retries in milliseconds (2 seconds)

    while (attempts < maxAttempts) {
        try {
            const name = await contract.name();
            const symbol = await contract.symbol();
            return { name, symbol };
        } catch (error) {
            attempts++;
            console.log(`Attempt ${attempts} failed, retrying...`);

            if (error.code == "CALL_EXCEPTION") {
                return false
            }

            console.log(error.code +' for '+contractAddress)
            // Wait for the specified delay before retrying
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }

    // If all attempts fail, return false
    console.log('All attempts to fetch contract details failed.');
    return false;
}


async function getETHBalance(address) {
    
    let etherscanKey = getRotatingApiKey();
    console.log("using etherscan key " + etherscanKey)
    const url = `https://api.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=${etherscanKey}`;

    try {
        const response = await fetch(url); // Assuming you're using fetch
        const data = await response.json();

        if (data.status === '1' && data.message === 'OK') {
            let balance = ethers.utils.formatEther(data.result); // Convert from Wei to Ether
            balance = parseFloat(balance).toFixed(2); // Round to 2 decimal places
            return balance === '0.00' ? '0' : balance;
        } else {
            throw new Error('Etherscan API error');
        }
    } catch (err) {
        console.error(err);
        return null;
    }
}

async function getBaseETHBalance(address) {
    
    let etherscanKey = BASE_API_KEY;
    console.log("using etherscan key " + etherscanKey)
    const url = `https://api.basescan.org/api?module=account&action=balance&address=${address}&tag=latest&apikey=${etherscanKey}`;

    try {
        const response = await fetch(url); // Assuming you're using fetch
        const data = await response.json();

        if (data.status === '1' && data.message === 'OK') {
            let balance = ethers.utils.formatEther(data.result); // Convert from Wei to Ether
            balance = parseFloat(balance).toFixed(2); // Round to 2 decimal places
            return balance === '0.00' ? '0' : balance;
        } else {
            throw new Error('Etherscan API error');
        }
    } catch (err) {
        console.error(err);
        return null;
    }
}

function extractUrls(text) {
    const urlRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    const urls = new Set();
    let match;
    while ((match = urlRegex.exec(text))) {
        if (!match[0].includes('eth.wiki') &&!match[0].includes('xn--2') && !match[0].includes('ethers.io') &&!match[0].includes('metamask.io') && !match[0].includes('readthedocs.io') && !match[0].includes('ethers.org') && !match[0].includes('github.io') && !match[0].includes('2π.com') && !match[0].includes('stackexchange.com') && !match[0].includes('soliditylang.org') && !match[0].includes('openzeppelin.com') && !match[0].includes('github.com') && !match[0].includes('ethereum.org') && !match[0].includes('consensys.net') && !match[0].includes('solidity.readthedocs.io') && !match[0].includes('hardhat.org') && !match[0].includes('wikipedia.org')) { 
            urls.add(match[0]);
        }
    }
    return [...urls];
}

function identifyContractType(abi) {
    // Check if ABI is a string, and try to convert to an object (JSON parse)
    if (typeof abi === 'string') {
        abi = JSON.parse(abi);
    }

    // Extract function names from the ABI
    const functionNames = abi
        .filter(entry => entry.type === 'function')
        .map(entry => entry.name);

    if (functionNames.includes('transfer') && functionNames.includes('balanceOf')) {
        if (functionNames.includes('safeTransferFrom')) {
            if (functionNames.includes('safeBatchTransferFrom')) {
                return 'ERC1155';
            }
            return 'ERC721';
        }
        return 'ERC20';
    }
    return 'Other';
}

function findTelegramLink(arr) {
    for (let i = 0; i < arr.length; i++) {
        if (arr[i].includes("t.me")) {
            return arr[i];
        }
    }
    return 'None';
}

function findTwitterLink(arr) {
    for (let i = 0; i < arr.length; i++) {
        if (arr[i].includes("twitter.com") || arr[i].includes("x.com")) {
            return arr[i];
        }
    }
    return 'None';
}
function findWebsiteLink(arr) {
    for (let i = 0; i < arr.length; i++) {
        if (!arr[i].includes("t.me") && !arr[i].includes("twitter.com") && !arr[i].includes("medium.com") && !arr[i].includes("gitbook")) {
            return arr[i];
        }
    }
    return 'None';
}
async function getDeployerAddress(contractAddress) {


    let etherscanKey = getRotatingApiKey();
    console.log("using etherscan key " + etherscanKey)

    const URL = `https://api.etherscan.io/api?module=account&action=txlist&address=${contractAddress}&startblock=0&endblock=99999999&sort=asc&apikey=${etherscanKey}`;

    try {
        const response = await axios.get(URL);
        
        if (response.data.status === "1" && response.data.result.length > 0) {
            // Assuming the first transaction is the deployment transaction
            return response.data.result[0].from;
        } else {
            //console.log(response.data.message);  // Logs the message from Etherscan, e.g., "No transactions found"
            return null;
        }
    } catch (error) {
        console.error('Error:', error.message);
        return null;
    }
}
async function getBaseDeployerAddress(contractAddress) {


    let basescanKey = BASE_API_KEY
    console.log("using etherscan key " + basescanKey)

    const URL = `https://api.basescan.org/api?module=account&action=txlist&address=${contractAddress}&startblock=0&endblock=99999999&sort=asc&apikey=${basescanKey}`;

    try {
        const response = await axios.get(URL);
        
        if (response.data.status === "1" && response.data.result.length > 0) {
            // Assuming the first transaction is the deployment transaction
            return response.data.result[0].from;
        } else {
            //console.log(response.data.message);  // Logs the message from Etherscan, e.g., "No transactions found"
            return null;
        }
    } catch (error) {
        console.error('Error:', error.message);
        return null;
    }
}

async function getDeployedContracts(address, excludeAddress) {

    let etherscanKey = getRotatingApiKey();
    console.log("using etherscan key " + etherscanKey)

    const URL = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${etherscanKey}`;

    try {
        const response = await axios.get(URL);
        
        if (response.data.status === "1" && response.data.result.length > 0) {
            // Filter for contract deployment transactions
            const deployedContracts = response.data.result.filter(tx => 
                (tx.to === null || tx.to === '') &&
                (excludeAddress.toLowerCase() ? tx.contractAddress.toLowerCase() !== excludeAddress.toLowerCase() : true)
            );

            // Return the list of contract addresses along with their deployment timestamps and token symbols
            const contractsData = [];
            for (const tx of deployedContracts) {
                const contractInfo = await getContractDetails(tx.contractAddress);
                contractsData.push({
                    contractAddress: tx.contractAddress,
                    deploymentTimestamp: parseInt(tx.timeStamp) * 1000, // Convert to JavaScript timestamp (in ms)
                    symbol: contractInfo.symbol
                });
            }
            return contractsData;
        } else {
            //console.log(response.data.message);  // Logs the message from Etherscan, e.g., "No transactions found"
            return [];
        }
    } catch (error) {
        console.error('Error:', error.message);
        return [];
    }
}

async function getDeployedBaseContracts(address, excludeAddress) {
    let basescanKey = BASE_API_KEY;
    console.log("using basescan key " + basescanKey);

    // Update the URL for BaseScan's endpoint, change if using a different network like Goerli or Sepolia
    const URL = `https://api.basescan.org/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${basescanKey}`;

    try {
        const response = await axios.get(URL);
        
        if (response.data.status === "1" && response.data.result.length > 0) {
            // Filter for contract deployment transactions
            const deployedContracts = response.data.result.filter(tx => 
                (tx.to === null || tx.to === '') &&
                (!excludeAddress || (tx.contractAddress && tx.contractAddress.toLowerCase() !== excludeAddress.toLowerCase()))
            );

            // Assuming getContractDetails is a function you've defined to fetch additional contract info
            const contractsData = [];
            for (const tx of deployedContracts) {
                const contractInfo = await getBaseContractDetails(tx.contractAddress);
                contractsData.push({
                    contractAddress: tx.contractAddress,
                    deploymentTimestamp: parseInt(tx.timeStamp) * 1000, // Convert to JavaScript timestamp (in ms)
                    // BaseScan might not provide token symbol information directly; this might need a different approach
                    symbol: contractInfo ? contractInfo.symbol : 'N/A' // You might need to adjust this part
                });
            }
            return contractsData;
        } else {
            // Logs the message from BaseScan, e.g., "No transactions found"
            console.log(response.data.message);
            return [];
        }
    } catch (error) {
        console.error('Error:', error.message);
        return [];
    }
}


async function getFundingSources(address) {

    let etherscanKey = getRotatingApiKey();
    console.log("using etherscan key " + etherscanKey)

    const BASE_URL = `https://api.etherscan.io/api?module=account&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${etherscanKey}`;
    const TX_URL = `${BASE_URL}&action=txlist`;
    const INTERNAL_TX_URL = `${BASE_URL}&action=txlistinternal`;

    const sources = {};

    try {
        // Fetch standard transactions
        const responseTx = await axios.get(TX_URL);
        if (responseTx.data.status === "1" && responseTx.data.result.length > 0) {
            const incomingTransactions = responseTx.data.result.filter(tx => tx.to.toLowerCase() === address.toLowerCase());
            incomingTransactions.forEach(tx => {
                const timeOfTx = Number(tx.timeStamp) * 1000; // Convert to milliseconds
                if (!sources[tx.from]) {
                    sources[tx.from] = { address: tx.from, value: 0, time: timeOfTx };
                }
                sources[tx.from].value += parseFloat(tx.value);
            });
        }

        // Fetch internal transactions
        const responseInternalTx = await axios.get(INTERNAL_TX_URL);
        if (responseInternalTx.data.status === "1" && responseInternalTx.data.result.length > 0) {
            const incomingInternalTransactions = responseInternalTx.data.result.filter(tx => tx.to.toLowerCase() === address.toLowerCase());
            incomingInternalTransactions.forEach(tx => {
                const timeOfTx = Number(tx.timeStamp) * 1000; // Convert to milliseconds
                if (!sources[tx.from]) {
                    sources[tx.from] = { address: tx.from, value: 0, time: timeOfTx };
                }
                sources[tx.from].value += parseFloat(tx.value);
            });
        }

        // Convert to array, filter, and sort by time
        return Object.values(sources)
        .filter(source => source.value > 1e15)  // Exclude sources with value less than 0.01 Ether
        .map(source => ({
            address: source.address,
            value: parseFloat((source.value / 1e18).toFixed(2)),  // Convert from wei to Ether and round to two decimal points
            time: source.time
        }))
        .sort((a, b) => a.time - b.time)  // Sort by time ascending
        .slice(0, 4);  // Take only the first four elements
    } catch (error) {
        console.error('Error:', error.message);
        return [];
    }
}
async function getBaseFundingSources(address) {
    let basescanKey = BASE_API_KEY2;
    console.log("using basescan key " + basescanKey);

    // Update BASE_URL for BaseScan's endpoint
    const BASE_URL = `https://api.basescan.org/api?module=account&address=${address}&startblock=0&sort=asc&apikey=${basescanKey}`;
    const TX_URL = `${BASE_URL}&action=txlist`;
    const INTERNAL_TX_URL = `${BASE_URL}&action=txlistinternal`;

    const sources = {};

    try {
        // Fetch standard transactions
        const responseTx = await axios.get(TX_URL);
        if (responseTx.data.status === "1" && responseTx.data.result.length > 0) {
            const incomingTransactions = responseTx.data.result.filter(tx => tx.to.toLowerCase() === address.toLowerCase());
            incomingTransactions.forEach(tx => {
                const timeOfTx = Number(tx.timeStamp) * 1000; // Convert to milliseconds
                if (!sources[tx.from]) {
                    sources[tx.from] = { address: tx.from, value: 0, time: timeOfTx };
                }
                sources[tx.from].value += parseFloat(tx.value);
            });
        }

        // Fetch internal transactions
        const responseInternalTx = await axios.get(INTERNAL_TX_URL);
        if (responseInternalTx.data.status === "1" && responseInternalTx.data.result.length > 0) {
            const incomingInternalTransactions = responseInternalTx.data.result.filter(tx => tx.to.toLowerCase() === address.toLowerCase());
            incomingInternalTransactions.forEach(tx => {
                const timeOfTx = Number(tx.timeStamp) * 1000; // Convert to milliseconds
                if (!sources[tx.from]) {
                    sources[tx.from] = { address: tx.from, value: 0, time: timeOfTx };
                }
                sources[tx.from].value += parseFloat(tx.value);
            });
        }

        // Convert to array, filter, and sort by time
        return Object.values(sources)
        .filter(source => source.value > 1e15)  // Exclude sources with value less than 0.01 Ether
        .map(source => ({
            address: source.address,
            value: parseFloat((source.value / 1e18).toFixed(2)),  // Convert from wei to Ether and round to two decimal points
            time: source.time
        }))
        .sort((a, b) => a.time - b.time)  // Sort by time ascending
        .slice(0, 3);  // Take only the first three elements
    } catch (error) {
        console.error('Error:', error.message);
        return [];
    }
}


function extractTwitterUsername(url) {
    // This regex matches both twitter.com/username and x.com/username patterns
    const regex = /(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/;
    const match = url.match(regex);
    return match ? match[1] : "No Twitter!";
  }
  
  async function getFollowerCount(username) {

    if (username == "No Twitter!") return {followerCount: "None"};

    try {
      const response = await T.get('users/show', { screen_name: username });
  
      return {
        followerCount: response.data.followers_count
      };
  
    } catch (error) {
      if (error.statusCode === 404) {
        return "User not found"
      } else {
        console.error(`Error fetching data for user ${username}:`, error.message);
        return "User not found"
        ;
      }
    }
  }

  async function sendVerifiedEmbedWebhook(data) {
    const UNCHAINED_VERIFIED_URL = 'https://discord.com/api/webhooks/1169808251454488606/3pbp1bod14P2R1-ScHOalzk3a7w8Poiy0UPZb70HuGDZmGd4KcZbBJPbXiHDMikWtsXq';
    const FT_VERIFIED_URL = 'https://discord.com/api/webhooks/1190915607596642407/J3tCEY9NhEI4Kc9d0tgi3AmSoR_TIQoj3-3HZrV77EbSdlArshCSdHzzfovdlPhElJgG';
    const NUN_VERIFIED_URL = 'https://discord.com/api/webhooks/1191943536548003871/kOjWap1JR6j5Qdetpe_HJFcpsja9aWF6R5el5-GtSIguCr8bCM2ZxTtXfPidEcssmO_J';
    const SEVEN_SINS_VERIFIED_URL = 'https://discord.com/api/webhooks/1194048883509186681/pAISwShLw4nzaueXhWnaG-sLAEkbCvFuWyg4FZmtUMyl_frtrvIlfaeozyk6NNANqUpH';
    // Handle asynchronous operations for formatting addresses
    const formattedPreviousContracts = data.previousContracts && data.previousContracts.length > 0 ? 
        await Promise.all(data.previousContracts.map(async contract => {
            const symbolOrName = contract.symbol || "Contract";

            return `[${symbolOrName}](https://etherscan.io/address/${contract.contractAddress})`;
        })) : ["None"];

    const previousContractsDisplay = formattedPreviousContracts.join('\n');

    const formattedFundingSources = await Promise.all(data.fundingSources.map(async source => {
        const formattedAddress = await formatAddress(source.address);
        return `[${formattedAddress}](https://etherscan.io/address/${source.address})`;
    }));

    const ethAmounts = data.fundingSources.map(source => `${source.value} ETH`).join('\n');
    const times = data.fundingSources.map(source => `<t:${source.time/1000}:R>`).join('\n');

    const embed = {
        title: "New Verified Contract",
        url: `https://etherscan.io/address/${data.contractAddress}`,
        color: 0xff045f, // You can set whatever color you want in HEX format
        fields: [
            { name: `🔖 ${data.contractInfo.name} (${data.contractInfo.symbol})`, value: "", inline: false },
            { name: `📍 Contract Address`, value: `${data.contractAddress}`, inline: false },
            { name: "🐦 Twitter Link", value: data.twitterLink, inline: false },
            { name: "📞 Telegram Link", value: data.telegramLink, inline: false },
            { name: "🌐 Website Link", value: data.websiteLink, inline: false },
            { name: "🔗 Other URLs", value: data.extractedUrls.length > 0 ? data.extractedUrls.map(url => `• ${url}`).join('\n') : '• None', inline: false },
            { name: "🛠️ Contract Deployer", value: `[${await formatAddress(data.contractCreator)}](https://etherscan.io/address/${data.contractCreator})`, inline: true },
            { name: '\u200B', value: '\u200B', inline: true },  // Add a blank inline field
            { name: 'ETH Balance', value: ` ${data.deployerBalance} ETH`, inline: true },
            { name: "Previous Contracts", value: previousContractsDisplay, inline: true },
            { name: '\u200B', value: '\u200B', inline: true },  // Add a blank inline field
            { name: "Deployment Times", value: data.previousContracts.map(contract => `<t:${contract.deploymentTimestamp / 1000}:R>`).join('\n'), inline: true },
            {
                name: "💰 Funding Sources",
                value: formattedFundingSources.join('\n'),
                inline: true
            },
            { name: 'ETH Amount', value: ethAmounts, inline: true },
            { name: 'Time', value: times, inline: true },
            { name: "🔗 Links", value: `[Dextools](https://www.dextools.io/app/en/ether/pair-explorer/${data.contractAddress}) | [Dexscreener](https://dexscreener.com/ethereum/${data.contractAddress}) | [DexSpy](https://dexspy.io/eth/token/${data.contractAddress})\n[Maestro](https://t.me/MaestroSniperBot?start=${data.contractAddress}) | [Banana](https://t.me/BananaGunSniper_bot?start=ref_Unchained_${data.contractAddress}) | [Shuriken](https://t.me/ShurikenTradeBot?start=qt-inworkwetrust-${data.contractAddress}) | [OttoSim](https://t.me/OttoSimBot?start=${data.contractAddress})`, inline: true },
        ],
        timestamp: new Date(),
        footer: {
            text: "Unchained",
            icon_url: "https://cdn.discordapp.com/attachments/888244235407605800/1080223489224626308/UNCHAINED_AGENCY_LOGO_TWITTER_PROFILE_PICTURE_CIRCLE.png"
        }
    };

    try {
        await axios.post(UNCHAINED_VERIFIED_URL, {embeds: [embed]});
        await axios.post(FT_VERIFIED_URL, {embeds: [embed]});
        await axios.post(NUN_VERIFIED_URL, {embeds: [embed]});
        await axios.post(SEVEN_SINS_VERIFIED_URL, {embeds: [embed]});
    } catch (error) {
        console.error("Error sending data to Discord:", error);
    }
}
    async function sendIndepthMetadropEmbed(data) {
        const UNCHAINED_METADROP_URL = 'https://discord.com/api/webhooks/1170074192725672016/gyyj2b4RQpkPlIxNK-K0pXn50f3r14iuCnA2TveU8zQ8sF5IUY98nqmLpBv43_tMom7L';
        const SPLIZZ_METADROP_URL = 'https://discord.com/api/webhooks/1170423916729204756/83uBTKcpCHJgf_QzhmE-5oghcHVCvKS5iyE7p6bkTvRmb0wg53hJLVSEAc2NUiRSqeF1';

        // Handle asynchronous operations for formatting addresses
        const formattedPreviousContracts = data.previousContracts && data.previousContracts.length > 0 ?
            await Promise.all(data.previousContracts.map(async contract => {
                const symbolOrName = contract.symbol || "Contract";
                const formattedAddress = await formatAddress(contract.contractAddress);
                return `[${symbolOrName}](https://etherscan.io/address/${contract.contractAddress})`;
            })) : ["None"];
    
        const previousContractsDisplay = formattedPreviousContracts.join('\n');
    
        const formattedFundingSources = await Promise.all(data.fundingSources.map(async source => {
            const formattedAddress = await formatAddress(source.address);
            return `[${formattedAddress}](https://etherscan.io/address/${source.address})`;
        }));
    
        const ethAmounts = data.fundingSources.map(source => `${source.value} ETH`).join('\n');
        let times = data.fundingSources.map(source => `<t:${source.time / 1000}:R>`).join('\n');
    
        const embed = {
            title: "Indepth Metadrop Contract",
            url: `https://etherscan.io/address/${data.contractAddress}`,
            color: 0xff045f,
            fields: [
                { name: `🔖 ${data.contractInfo.name} (${data.contractInfo.symbol})`, value: "", inline: false },
                { name: `📍 Contract Address`, value: `${data.contractAddress}`, inline: false },
                { name: "🛠️ Contract Deployer", value: `[${await formatAddress(data.contractCreator)}](https://etherscan.io/address/${data.contractCreator})`, inline: true },
                { name: '\u200B', value: '\u200B', inline: true },  // Blank inline field
                { name: 'ETH Balance', value: `${data.deployerBalance} ETH`, inline: true },
                { name: "Previous Contracts", value: previousContractsDisplay, inline: true },
                { name: '\u200B', value: '\u200B', inline: true },  // Blank inline field
                { name: "Deployment Times", value: data.previousContracts.map(contract => `<t:${contract.deploymentTimestamp / 1000}:R>`).join('\n'), inline: true },
                {
                    name: "💰 Funding Sources",
                    value: formattedFundingSources.join('\n'),
                    inline: true
                },
                { name: 'ETH Amount', value: ethAmounts, inline: true },
                { name: 'Time', value: times, inline: true },
                {
                    name: "🔗 Links",
                    value: `[Dextools](https://www.dextools.io/app/en/ether/pair-explorer/${data.contractAddress}) | [Dexscreener](https://dexscreener.com/ethereum/${data.contractAddress}) | [DexSpy](https://dexspy.io/eth/token/${data.contractAddress})\n[Maestro](https://t.me/MaestroSniperBot?start=${data.contractAddress}) | [Banana](https://t.me/BananaGunSniper_bot?start=ref_Unchained_${data.contractAddress}) | [Shuriken](https://t.me/ShurikenTradeBot?start=qt-inworkwetrust-${data.contractAddress}) | [OttoSim](https://t.me/OttoSimBot?start=${data.contractAddress})`,
                    inline: true
                },
            ],
            timestamp: new Date(),
            footer: {
                text: "Unchained",
                icon_url: "https://cdn.discordapp.com/attachments/888244235407605800/1080223489224626308/UNCHAINED_AGENCY_LOGO_TWITTER_PROFILE_PICTURE_CIRCLE.png"
            }
        };
    
        try {
            await axios.post(UNCHAINED_METADROP_URL, {embeds: [embed]});
            await axios.post(SPLIZZ_METADROP_URL, {embeds: [embed]});
        } catch (error) {
            console.error("Error sending data to Discord:", error);
        }
    }


    async function sendContractDeployedEmbed(data) {
        const UNCHAINED_DEPLOY_URL = 'https://discord.com/api/webhooks/1169810045324755024/Ed9_9b8qTt_3fdDtMfBZ94axR0JzyM716XNwDZ3sdWSW15b0U31D4PiVPs2lK3OiSEyt';
    
    
        // Handle asynchronous operations for formatting addresses
        const formattedPreviousContracts = data.previousContracts && data.previousContracts.length > 0 ?
            await Promise.all(data.previousContracts.map(async contract => {
                const symbolOrName = contract.symbol || "Contract";
                const formattedAddress = await formatAddress(contract.contractAddress);
                return `[${symbolOrName}](https://etherscan.io/address/${contract.contractAddress})`;
            })) : ["None"];
    
    
        const previousContractsDisplay = formattedPreviousContracts.join('\n');
    
        const formattedFundingSources = await Promise.all(data.fundingSources.map(async source => {
            const formattedAddress = await formatAddress(source.address);
            return `[${formattedAddress}](https://etherscan.io/address/${source.address})`;
        }));
        
        const ethAmounts = data.fundingSources.map(source => `${source.value} ETH`).join('\n');
        let times = data.fundingSources.map(source => `<t:${source.time / 1000}:R>`).join('\n');
    
        const embed = {
            title: "New Contract Deployed",
            url: `https://etherscan.io/address/${data.contractAddress}`,
            color: 0xff045f,
            fields: [
                { name: `🔖 ${data.contractInfo.name} (${data.contractInfo.symbol})`, value: "", inline: false },
                { name: `📍 Contract Address`, value: `${data.contractAddress}`, inline: false },
                { name: "🛠️ Contract Deployer", value: `[${await formatAddress(data.contractCreator)}](https://etherscan.io/address/${data.contractCreator})`, inline: true },
                { name: '\u200B', value: '\u200B', inline: true },
                { name: 'ETH Balance', value: `${data.deployerBalance} ETH`, inline: true },
                { name: "Previous Contracts", value: previousContractsDisplay, inline: true },
                { name: '\u200B', value: '\u200B', inline: true },
                { name: "Deployment Times", value: data.previousContracts.map(contract => `<t:${contract.deploymentTimestamp / 1000}:R>`).join('\n'), inline: true },
                {
                    name: "💰 Funding Sources",
                    value: formattedFundingSources.join('\n'),
                    inline: true
                },
                { name: 'ETH Amount', value: ethAmounts, inline: true },
                { name: 'Time', value: times, inline: true },
                {
                    name: "🔗 Links", value: `[Dextools](https://www.dextools.io/app/en/ether/pair-explorer/${data.contractAddress}) | [Dexscreener](https://dexscreener.com/ethereum/${data.contractAddress}) | [DexSpy](https://dexspy.io/eth/token/${data.contractAddress})\n[Maestro](https://t.me/MaestroSniperBot?start=${data.contractAddress}) | [Banana](https://t.me/BananaGunSniper_bot?start=ref_Unchained_${data.contractAddress}) | [Shuriken](https://t.me/ShurikenTradeBot?start=qt-inworkwetrust-${data.contractAddress}) | [OttoSim](https://t.me/OttoSimBot?start=${data.contractAddress})`,
                    inline: true
                },
            ],
            timestamp: new Date(),
            footer: {
                text: "Unchained",
                icon_url: "https://cdn.discordapp.com/attachments/888244235407605800/1080223489224626308/UNCHAINED_AGENCY_LOGO_TWITTER_PROFILE_PICTURE_CIRCLE.png"
            }
        };
    
    
        try {
            await axios.post(UNCHAINED_DEPLOY_URL, {embeds: [embed]});
        } catch (error) {
            console.error("Error sending data to Discord:", error);
        }
    }

monitorFunctions.runDeployedChecks = async (contractAddress, contractDeployer, discordClient) => {

    try {
        console.log("DEPLOYED CHECKS")
        let contractType = await unverifiedContractType(contractAddress);    
        console.log("Contract Type:", contractType) // Log the type of contract.

        let contractInfo = await getContractDetails(contractAddress)
        console.log("Contract Info:", contractInfo) // Log details about the contract.

        if (!contractInfo) return; 

        /*
        if (contractType == "Other") {
            return;
        }*/
        console.log("Deployer: " + contractDeployer)
        let contractCreator = contractDeployer;
        console.log("Contract Creator:", await contractCreator) // Log the contract creator's address with its nametag.

        let deployerBalance = await getETHBalance(contractCreator)
        console.log("Deployer Balance:", deployerBalance) // Log the deployer's ETH balance.


        let previousContracts = await getDeployedContracts(contractCreator, contractAddress)
        console.log("Previous Contracts:", previousContracts) // Log information about previous contracts deployed by the same creator.
        
        let fundingSources = await getFundingSources(contractCreator)
        console.log("Funding Sources:", fundingSources) // Log the funding sources for the contract creator.


        /*let renouncedInfo = await checkContractRenounced(contractAddress)
        console.log(renouncedInfo)*/
        /*let isTokenLive = isTokenLive(
            '0x28C6c06298d514Db089934071355E5743bf21d60', //binance exchange wallet w/ eth
            contractAddress, 
            '0.01' // ETH amount to swap
        )
        console.log("isTokenLive:", isTokenLive) */

        //SEND DISCORD WEBHOOK HERE
        const data = {
            contractType,
            contractCreator,
            previousContracts,
            fundingSources,
            contractInfo,
            deployerBalance,
            contractAddress 
        };

        sendContractDeployedEmbeds(data, discordClient)
    } catch (error) {
    console.error("Error sending webhook:", error);
    }
}


monitorFunctions.runBaseDeployedChecks = async (contractAddress, contractDeployer, discordClient) => {

    console.log(contractAddress + " DEPLOYED ON BASE")
    

    try {
        console.log("BASE DEPLOYED CHECKS")

        /*let contractType = await unverifiedContractType(contractAddress);    
        console.log("Contract Type:", contractType) // Log the type of contract.*/

        let contractInfo = await getBaseContractDetails(contractAddress)
        console.log("Contract Info:", contractInfo) // Log details about the contract.

        if (!contractInfo) return; 


            
        /*
        if (contractType == "Other") {
            return;
        }*/
        console.log("Deployer: " + contractDeployer)
        let contractCreator = contractDeployer;
        console.log("Contract Creator:", await contractCreator) // Log the contract creator's address with its nametag.

        let deployerBalance = await getBaseETHBalance(contractCreator)
        console.log("Deployer Balance:", deployerBalance) // Log the deployer's ETH balance.

        
        let previousContracts = await getDeployedBaseContracts(contractCreator, contractAddress)
        console.log("Previous Contracts:", previousContracts) // Log information about previous contracts deployed by the same creator.
        let fundingSources = await getBaseFundingSources(contractCreator)
        console.log("Funding Sources:", fundingSources) // Log the funding sources for the contract creator.


        /*let renouncedInfo = await checkContractRenounced(contractAddress)
        console.log(renouncedInfo)*/
        /*let isTokenLive = isTokenLive(
            '0x28C6c06298d514Db089934071355E5743bf21d60', //binance exchange wallet w/ eth
            contractAddress, 
            '0.01' // ETH amount to swap
        )
        console.log("isTokenLive:", isTokenLive) */

        //SEND DISCORD WEBHOOK HERE
        const data = {
            //contractType,
            contractCreator,
            previousContracts,
            fundingSources,
            contractInfo,
            deployerBalance,
            contractAddress 
        };

        sendBaseContractDeployedEmbeds(data, discordClient)
    } catch (error) {
    console.error("Error sending webhook:", error);
    }
}





monitorFunctions.runUnicryptChecks = async (contractAddress, lockPercent, lockUnixTimestamp, contractInfo, discord) => {
    console.log("I RAN")
    const url = `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${ETHERSCAN_API_KEY}`;
    
    try {
        const response = await axios.get(url);

        ////console.log(response.data); // This logs the whole response. You can narrow it down to specific parts if needed.
        let contractType = identifyContractType(response.data.result[0].ABI)
        //console.log("Contract Type:", contractType) // Log the type of contract.
        
        if (contractType == "Other") {
            return;
        }
        
        let extractedUrls = extractUrls(response.data.result[0].SourceCode)
        console.log("Extracted URLs:", extractedUrls) // Log the extracted URLs from the source code.
        
        let telegramLink = findTelegramLink(extractedUrls)
        console.log("Telegram Link:", telegramLink) // Log the Telegram link if found.
        
        let twitterLink = findTwitterLink(extractedUrls)
        //console.log("Twitter Link:", twitterLink) // Log the Twitter link if found.
        
        let websiteLink = findWebsiteLink(extractedUrls)
        //console.log("Website Link:", websiteLink) // Log the website link if found.
        extractedUrls = extractedUrls.filter(url => url !== telegramLink && url !== twitterLink && url !== websiteLink);

        let contractCreator = await getDeployerAddress(contractAddress)
        console.log("Contract Creator:", contractCreator) // Log the contract creator's address with its nametag.

        let deployerBalance = await getETHBalance(contractCreator)
        console.log("Deployer Balance:", deployerBalance) // Log the deployer's ETH balance.
        
        let previousContracts = await getDeployedContracts(contractCreator, contractAddress)
        console.log("Previous Contracts:", previousContracts) // Log information about previous contracts deployed by the same creator.
        
        let fundingSources = await getFundingSources(contractCreator)
        console.log("Funding Sources:", fundingSources) // Log the funding sources for the contract creator.

        /* renouncedInfo = await checkContractRenounced(contractAddress)
        console.log(renouncedInfo)*/

        

        if (contractCreator == null) {
            return //console.log("Probably a metadrop this is lacking a convential creation tx")
        }


        //SEND DISCORD WEBHOOK HERE
        const data = {
            lockPercent,
            lockUnixTimestamp,
            contractType,
            extractedUrls,
            telegramLink,
            twitterLink,
            websiteLink,
            contractCreator,
            previousContracts,
            fundingSources,
            contractInfo,
            deployerBalance,
            contractAddress 
        };

        console.log(data)
        sendUnicryptEmbeds(data, discord)
        //await sendVerifiedEmbed(data);

    } catch (error) {
        console.error("Error sending webhook:", error);
    }
}
monitorFunctions.runInitialMetadropChecks = async (contractAddress, contractCreator, symbol, name) => {

    const url = `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${ETHERSCAN_API_KEY}`;
    
    try {
        const response = await axios.get(url);

        ////console.log(response.data); // This logs the whole response. You can narrow it down to specific parts if needed.
        let contractType = "ERC20";
        //console.log("Contract Type:", contractType) // Log the type of contract.
        
        
        let deployerBalance = await getETHBalance(contractCreator)
        //console.log("Deployer Balance:", deployerBalance) // Log the deployer's ETH balance.
        
        let previousContracts = await getDeployedContracts(contractCreator, contractAddress)
        //console.log("Previous Contracts:", previousContracts) // Log information about previous contracts deployed by the same creator.
        
        let fundingSources = await getFundingSources(contractCreator)
        //console.log("Funding Sources:", fundingSources) // Log the funding sources for the contract creator.
        
        let contractInfo = { name: name, symbol: symbol}
    
        //SEND DISCORD WEBHOOK HERE
        const data = {
            contractType,
            contractCreator,
            previousContracts,
            fundingSources,
            contractInfo,
            deployerBalance,
            contractAddress 
        };

        await sendIndepthMetadropEmbed(data);

    } catch (error) {
        console.error("Error sending webhook:", error);
    }
}
monitorFunctions.runVerifiedChecks = async (contractAddress) => {

    const url = `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${ETHERSCAN_API_KEY}`;
    
    try {
        const response = await axios.get(url);

        ////console.log(response.data); // This logs the whole response. You can narrow it down to specific parts if needed.
        let contractType = identifyContractType(response.data.result[0].ABI)
        //console.log("Contract Type:", contractType) // Log the type of contract.
        
        if (contractType == "Other") {
            return;
        }
        
        let extractedUrls = extractUrls(response.data.result[0].SourceCode)
        //console.log("Extracted URLs:", extractedUrls) // Log the extracted URLs from the source code.
        
        let telegramLink = findTelegramLink(extractedUrls)
        //console.log("Telegram Link:", telegramLink) // Log the Telegram link if found.
        
        let twitterLink = findTwitterLink(extractedUrls)
        //console.log("Twitter Link:", twitterLink) // Log the Twitter link if found.
        
        let websiteLink = findWebsiteLink(extractedUrls)
        //console.log("Website Link:", websiteLink) // Log the website link if found.
        extractedUrls = extractedUrls.filter(url => url !== telegramLink && url !== twitterLink && url !== websiteLink);

        let contractCreator = await getDeployerAddress(contractAddress)
        //console.log("Contract Creator:", contractCreator) // Log the contract creator's address with its nametag.

        let deployerBalance = await getETHBalance(contractCreator)
        //console.log("Deployer Balance:", deployerBalance) // Log the deployer's ETH balance.
        
        let previousContracts = await getDeployedContracts(contractCreator, contractAddress)
        //console.log("Previous Contracts:", previousContracts) // Log information about previous contracts deployed by the same creator.
        
        let fundingSources = await getFundingSources(contractCreator)
        //console.log("Funding Sources:", fundingSources) // Log the funding sources for the contract creator.
        
        //let twitterUsername = await extractTwitterUsername(twitterLink)
        //console.log("Twitter Username:", twitterUsername) // Log the extracted Twitter username.
        
        //let twitterFollowers = await getFollowerCount(twitterUsername)
        //console.log("Twitter Followers:", twitterFollowers) // Log the number of Twitter followers for the username.

        let contractInfo = await getContractDetails(contractAddress)
        //console.log("Contract Info:", contractInfo) // Log details about the contract.

        let renouncedInfo = await checkBaseContractRenounced(contractAddress)
        console.log(renouncedInfo)

        

        if (contractCreator == null) {
            return //console.log("Probably a metadrop this is lacking a convential creation tx")
        }


        //SEND DISCORD WEBHOOK HERE
        const data = {
            contractType,
            extractedUrls,
            telegramLink,
            twitterLink,
            websiteLink,
            contractCreator,
            previousContracts,
            fundingSources,
            contractInfo,
            deployerBalance,
            contractAddress 
        };

        await sendVerifiedEmbed(data);

    } catch (error) {
        console.error("Error sending webhook:", error);
    }
}
monitorFunctions.runBaseVerifiedChecks = async (contractAddress) => {

    const url = `https://api.basescan.org/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${BASE_API_KEY}`;
    
    try {
        const response = await axios.get(url);

        ////console.log(response.data); // This logs the whole response. You can narrow it down to specific parts if needed.
        let contractType = identifyContractType(response.data.result[0].ABI)
        //console.log("Contract Type:", contractType) // Log the type of contract.
        
        if (contractType == "Other") {
            return;
        }
        
        let extractedUrls = extractUrls(response.data.result[0].SourceCode)
        //console.log("Extracted URLs:", extractedUrls) // Log the extracted URLs from the source code.
        
        let telegramLink = findTelegramLink(extractedUrls)
        //console.log("Telegram Link:", telegramLink) // Log the Telegram link if found.
        
        let twitterLink = findTwitterLink(extractedUrls)
        //console.log("Twitter Link:", twitterLink) // Log the Twitter link if found.
        
        let websiteLink = findWebsiteLink(extractedUrls)
        //console.log("Website Link:", websiteLink) // Log the website link if found.
        extractedUrls = extractedUrls.filter(url => url !== telegramLink && url !== twitterLink && url !== websiteLink);

        let contractCreator = await getBaseDeployerAddress(contractAddress)
        //console.log("Contract Creator:", contractCreator) // Log the contract creator's address with its nametag.

        let deployerBalance = await getBaseETHBalance(contractCreator)
        //console.log("Deployer Balance:", deployerBalance) // Log the deployer's ETH balance.
        
        let previousContracts = await getDeployedBaseContracts(contractCreator, contractAddress)
        //console.log("Previous Contracts:", previousContracts) // Log information about previous contracts deployed by the same creator.
        
        let fundingSources = await getBaseFundingSources(contractCreator)
        //console.log("Funding Sources:", fundingSources) // Log the funding sources for the contract creator.
        
        //let twitterUsername = await extractTwitterUsername(twitterLink)
        //console.log("Twitter Username:", twitterUsername) // Log the extracted Twitter username.
        
        //let twitterFollowers = await getFollowerCount(twitterUsername)
        //console.log("Twitter Followers:", twitterFollowers) // Log the number of Twitter followers for the username.

        let contractInfo = await getBaseContractDetails(contractAddress)
        //console.log("Contract Info:", contractInfo) // Log details about the contract.

        let renouncedInfo = await checkContractRenounced(contractAddress)
        console.log(renouncedInfo)

        

        if (contractCreator == null) {
            return //console.log("Probably a metadrop this is lacking a convential creation tx")
        }


        //SEND DISCORD WEBHOOK HERE
        const data = {
            contractType,
            extractedUrls,
            telegramLink,
            twitterLink,
            websiteLink,
            contractCreator,
            previousContracts,
            fundingSources,
            contractInfo,
            deployerBalance,
            contractAddress 
        };

        await sendVerifiedEmbed(data);

    } catch (error) {
        console.error("Error sending webhook:", error);
    }
}

module.exports = monitorFunctions;