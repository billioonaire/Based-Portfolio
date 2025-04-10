const axios = require('axios');
const { ethers } = require('ethers');

// Load the ABI using require
const metadropABI = require('./abi/MetadropFactoryABI.json'); // Adjust the path as needed
const iface = new ethers.utils.Interface(metadropABI);


let tx = {
    status: 'pending',
    hash: '0x846ef730aeda82e9970792c40ec0a414c2303a9aa7bc5240ed3d717a0ec1d072',
    from: '0x9724137b1d47695564ea405C028027a93B2Bc8a5',
    to: '0x15D1e017deA053dbBc09AF22CC8D351C9eB0a0B2',
    value: '10000000000000000',
    gas: 16177771,
    nonce: 0,
    input: '0xb41b0bb6000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000314dc6448d9338c15b0a000000000000000000000000000000000000000000000000000000004563918244f4000000000000000000000000000000000000000000000052b7d2dcc80cd2e40000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000012546865204c69717569646974792047616d6500000000000000000000000000000000000000000000000000000000000000000000000000000000000000074c495147414d4500000000000000000000000000000000000000000000000000',
    blockHash: null,
    blockNumber: null,
    type: 2,
    maxFeePerGas: '37830104635',
    maxFeePerGasGwei: 37.8,
    maxPriorityFeePerGas: '100000000',
    maxPriorityFeePerGasGwei: 0.1,
    transactionIndex: null,
    asset: 'ETH',
    estimatedBlocksUntilConfirmed: null,
    watchedAddress: 'YOUR_WATCHED_ADDRESS',
    direction: 'incoming',
    counterparty: '0x2354C2E665301e2508032E3Bd8dA378c972eEa9B',
    serverVersion: '0.164.1',
    eventCode: 'txPool',
    timeStamp: '2023-11-15T01:53:29.128Z',
    dispatchTimestamp: '2023-11-15T01:53:29.257Z',
    system: 'ethereum',
    network: 'main',
    contractCall: undefined
  };


const simulateTransaction = async (transaction) => {
    const TENDERLY_USER = "w00fy7";
    const TENDERLY_PROJECT = "project";
    const TENDERLY_ACCESS_KEY = "YOUR_TENDERLY_ACCESS_KEY";

    /*try {

        const result = decodeTransactionData(transaction.input);
        console.log(result);
    } catch (error) {
        console.error('Error decoding transaction data:', error);
    }*/



    try {
        const response = await axios.post(
            `https://api.tenderly.co/api/v1/account/${TENDERLY_USER}/project/${TENDERLY_PROJECT}/simulate`,
            {
                save: false, // if true, the simulation is saved and shows up in the dashboard
                save_if_fails: false, // if true, reverting simulations show up in the dashboard
                simulation_type: "full", // 'full' or 'quick' (full is default)

                network_id: "1", // Mainnet
                block_number: 6606602, // Example block number
                //transaction_index: 42, // Example transaction index
                from: transaction.from,
                input: transaction.input,
                to: transaction.to,
                //gas: transaction.gas, // Example gas limit
                //gas_price: "32909736476", // Example gas price
                value: transaction.value, // Example value
                access_list: [],
                generate_access_list: true,
            },
            {
                headers: {
                    "X-Access-Key": TENDERLY_ACCESS_KEY
                },
            }
        );

        const logs = response.data.transaction.transaction_info.logs;

        let metaId, contractCreator, contractAddress, dripoolInstance, symbol, name, inputParams;
        
        logs.forEach((log) => {
            if (log.name === 'ERC20Created') {
                if (log.inputs.length >= 7) { // Ensure there are enough inputs
                    metaId = log.inputs[0].value;
                    contractCreator = log.inputs[1].value;
                    contractAddress = log.inputs[2].value;
                    dripoolInstance = log.inputs[3].value;
                    name = log.inputs[4].value;
                    symbol = log.inputs[5].value;
                    inputParams = log.inputs[6].value;
        
                    //console.log(`Meta ID: ${metaId}`);
                    console.log(`Contract Creator: ${contractCreator}`);
                    console.log(`Contract Address: ${contractAddress}`);
                    //console.log(`Dripool Instance: ${dripoolInstance}`);
                    console.log(`Symbol: ${symbol}`);
                    console.log(`Name: ${name}`);
                    //console.log(`Input Params: ${inputParams}`);
                }
            }
        });



    } catch (error) {
        console.error('Error during simulation:', error.response ? error.response.data : error.message);
    }
};

function decodeTransactionData(transactionInput) {

    const decodedData = iface.parseTransaction({ data: transactionInput });
    
    const args = decodedData.args;
    const hexTaxString = args[2].taxParameters;

    // Helper function to convert hex to decimal
    const hexToDec = (hex) => BigInt(`0x${hex}`).toString(10);

    // Extracting tax components
    const taxComponentStrings = hexTaxString.slice(2).match(/.{1,64}/g) || [];
    const taxComponents = taxComponentStrings.map(hexToDec);

    // Assigning tax variables
    const tax1 = taxComponents[0] || "Default Value";
    const tax2 = taxComponents[1] || "Default Value";
    const tax3 = taxComponents[2] || "Default Value";
    const tax4 = taxComponents[3] || "Default Value";
    const tax5 = taxComponents[4] || "Default Value";
    const tax6 = taxComponents[5] || "Default Value";
    const tax7 = taxComponents[6] || "Default Value";

    // ... continue for other tax components

    // Calculate taxes
    const buyTax = (parseInt(tax1) / 100 + parseInt(tax3) / 10).toFixed(2);
    const sellTax = (parseInt(tax2) / 100 + parseInt(tax3) / 10).toFixed(2);

    // Decode supply parameters
    const hexSupplyString = args[2].supplyParameters;
    console.log("Supply Parameters Hex String:", hexSupplyString);

    // Extracting supply components
    const supplyComponentStrings = hexSupplyString.slice(2).match(/.{1,64}/g) || [];
    const supplyComponents = supplyComponentStrings.map(hexToDec);

    // Assigning supply variables
    const totalSupply = supplyComponents[0] || "Default Value";
    const lpAmount = supplyComponents[1] || "Default Value";
    const teamCoins = supplyComponents[2] || "Default Value";
    const maxPerTX = supplyComponents[3] || "Default Value";
    const maxWallet = supplyComponents[4] || "Default Value";
    const lockTimeInDays = supplyComponents[5] || "Default Value";
    // ... continue for other supply components

    // Returning all the values
    return {
        tax1,
        tax2,
        tax3,
        tax4,
        tax5,
        tax6,
        tax7,
        buyTax,
        sellTax,
        totalSupply,
        lpAmount,
        teamCoins,
        maxPerTX,
        maxWallet,
        lockTimeInDays,
        // ... include other components here
    };
}

simulateTransaction(tx);
