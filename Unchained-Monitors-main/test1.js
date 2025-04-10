const axios = require('axios');
const ethers = require('ethers');

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

        console.log(response.data.transaction)


        // Check if the transaction was successful
        return response.data.transaction.status;

    } catch (error) {
        console.error('Error during simulation:', error.response ? error.response.data : error.message);
        return false;
    }
}

// Example usage
isTokenLive(
    '0x28C6c06298d514Db089934071355E5743bf21d60', 
    '0xa9e8acf069c58aec8825542845fd754e41a9489a', 
    '0.01' // ETH amount to swap
)
