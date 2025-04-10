# Friend.Tech-Sniper
This sniper is primarily built for sniping new shares on Friend.Tech - the new crypto/web3 platform that is funded by Paradigm. The main functionality is allowing shareholders to create tasks to buy shares up to a certain price for inputted twitter users. 

We will have users input their private keys and they will be encrypted the moment prior to entering the database only to be decrypted at runtime.

APPLICATION FRAMEWORK
This application has many components and all of them work together to make the sniper.
1. DATABASE
Much like the wallet tracker, the database will all be managed in MongoDB with the help of the `mongoose` library. The mongoose library is very nice to have because we want to have schemas created in order to avoid data that isn't formatted how it should be from entering the database. This also is very useful for dynamically updating the database. See the structure:
- user
    - discord_id: The users discord ID.
    - telegram_id: The users telegram ID.
    - identifier: The users encrypted private key.
    - proxyContract: The contract that the user deployed from our contract in order to mass buy/sell shares.
    - snipeTasks
        - twitter_handle: The handle of the twitter account that the user wants to snipe.
        - sweepPrice: The price that the user wants to sweep these shares to.
        - prio: The priority fee that users want to use when buying shares in this snipe.
    - spamTasks
        - name: The name that the user gives the task.
        - wallet_address: The wallet address that the user believes belongs to the user they want to snipe. This will be the wallet that is being monitored for base bridges/transfers.
        - startDelay: The amount of time that a user wants to wait after a wallet is funded from wallet_address before starting to spam transactions.
        - duration: The amount of time that a user wants to spam transactions for before stopping.

2. DISCORD BOT
Users of this application will be using a discord bot interface. This bot will be highly inspired by the wallet tracker, making use of the page system that was created in that. Any user inputs will be done through modals after being validated.

3. SMART CONTRACTS
A smart contract is being made for this bot that allows users to deploy their own "proxy contract" in the same way that that was done for the contract minter. Once a user deploys their own proxy, it will be stored in the database. Prior to running the command for the user to deploy their own contract, it will first check their wallet address to see if they have done so prior. Additionally, the contract will have the ability to perform any function that users want to in the case of an airdrop or NFT mint by friend.tech. The proxy contracts will also send 3% gains from selling shares to a specified wallet and have a variable for setting the tax.

4. TASKS
Tasks will be stored in the database (as noted above) but will also be stored locally in a tasks.json file. The main reason that they will be stored in the database is for easier analysis of data along with minimalizing the risk of losing user data.