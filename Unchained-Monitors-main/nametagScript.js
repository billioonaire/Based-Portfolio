const fs = require('fs');

const generateNametagsFile = (filePath, outputFilePath) => {
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(rawData);

    const exchanges = ["Huobi", "Binance", "Coinbase", "Kraken", "Bybit", "OKX", "Kucoin", "BitStamp", "Bitfinix", "Gate", "Bitget", "Bithumb", "Crypto.com", "Upbit", "Gemini", "Mexc", "HTX", "XT"];
    
    let fileContent = "";

    for (const [address, info] of Object.entries(data)) {
        let nametag = address; // Default to address

        if (info.name) {
            // Check if name contains any of the exchanges
            const foundExchange = exchanges.find(exchange => info.name.includes(exchange));
            if (foundExchange) {
                nametag = `🏛 ${foundExchange}:${address}`;
            } else {
                nametag = `${info.name}:${address}`;
            }

            fileContent += nametag + '\n';

        }

    }

    fs.writeFileSync(outputFilePath, fileContent.trim());
};

generateNametagsFile('etherscanNametags.json', 'nametags.txt');