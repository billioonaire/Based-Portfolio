const axios = require('axios');
const cheerio = require('cheerio');
const monitorFunctions = require("../monitorFunctions.js");
let knownAddresses = new Set();  // To keep track of addresses we've already seen
let isFirstRun = true;           // To track the first run of the scraper

async function scrapeEtherscan() {
    try {
        const response = await axios.get('https://etherscan.io/contractsVerified');
        
        const html = response.data;
        const $ = cheerio.load(html);
        
        // Temporary set for this iteration's addresses
        let currentAddresses = new Set();

        // Get all rows in the table
        const rows = $('#ContentPlaceHolder1_mainrow > div.table-responsive > table > tbody > tr');
        rows.each((index, row) => {
            // Extract the href attribute from the anchor tag in each row
            const href = $(row).find('td:nth-child(1) > span > a.me-1').attr('href');

            // Extract the Ethereum address from the href
            const address = href.replace('/address/', '').replace('#code', '');

            currentAddresses.add(address);
        });

        // Check and log new addresses
        currentAddresses.forEach(async(address) => {
            if (!knownAddresses.has(address)) {
                knownAddresses.add(address);
                
                if (!isFirstRun) {

                    console.log("New Verified Contract: ", address);
                    await monitorFunctions.runVerifiedChecks(address);
                }
            }
        });
        
        // After the first run is complete, update the flag
        isFirstRun = false;
        
    } catch (error) {
        //console.error("Error scraping Etherscan:", error);
    }
}

// Then run it every 5 seconds
function startVerifiedContractMonitor(discordClient) {
    // Run the scraping function every 5 seconds
    console.log("Starting Verified Contract Monitor")
    setInterval(scrapeEtherscan, 5000);
}

// Export the function for use in other modules
module.exports = {
    startVerifiedContractMonitor,
};