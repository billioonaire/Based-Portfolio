const { ButtonBuilder, ActionRowBuilder } = require(`discord.js`);

const taskTypeOptions = [ // Getting the types of tasks for select menus.
    {
        label: 'Snipe Task',
        value: 'snipeTask'
    },
    {
        label: 'Spam Task',
        value: 'spamTask'
    },
    {
        label: `Back to Main Menu`,
        value: `mainMenu`
    }
];

const sellFromOptions = [ // Getting the types of tasks for sell select menus.
    {
        label: 'Wallet',
        value: 'wallet'
    },
    {
        label: 'Proxy Contract',
        value: 'proxyContract'
    },
    {
        label: `Back to Main Menu`,
        value: `mainMenu`
    }
];

const createTaskButton = new ButtonBuilder()
    .setCustomId(`createTaskButton`)
    .setLabel(`Create Task`)
    .setStyle(`2`);

const manageTasksButton = new ButtonBuilder()
    .setCustomId(`manageTasksButton`)
    .setLabel(`Manage Tasks`)
    .setStyle(`2`);

const sellKeysButton = new ButtonBuilder()
    .setCustomId(`sellKeysButton`)
    .setLabel(`Sell Keys`)
    .setStyle(`2`);

const homeButton = new ButtonBuilder()
    .setCustomId(`homeButton`)
    .setEmoji(`🏠`)
    .setStyle(`2`);

const inputSpamWalletButton = new ButtonBuilder()
    .setCustomId(`inputSpamWalletButton`)
    .setLabel(`Input Wallet To Spam`)
    .setStyle(`2`);

const depositButton = new ButtonBuilder()
    .setCustomId(`depositButton`)
    .setLabel(`Deposit ETH`)
    .setStyle(`2`);

const withdrawButton = new ButtonBuilder()
    .setCustomId(`withdrawButton`)
    .setLabel(`Withdraw ETH`)
    .setStyle(`2`);

// BUTTONS FOR MANAGING TASKS
const changeSnipeTaskSweepPriceButton = new ButtonBuilder()
    .setCustomId(`changeSnipeTaskSweepPriceButton`)
    .setLabel(`Change Sweep Price`)
    .setStyle(`2`);

const changeSpamTaskSweepPriceButton = new ButtonBuilder()
    .setCustomId(`changeSpamTaskSweepPriceButton`)
    .setLabel(`Change Sweep Price`)
    .setStyle(`2`);

const changeSnipeTaskPrioButton = new ButtonBuilder()
    .setCustomId(`changeSnipeTaskPrioButton`)
    .setLabel(`Change Prio`)
    .setStyle(`2`);

const deleteSpamTaskButton = new ButtonBuilder()
    .setCustomId(`deleteSpamTaskButton`)
    .setLabel(`Delete Task`)
    .setStyle(`2`);

const deleteSnipeTaskButton = new ButtonBuilder()
    .setCustomId(`deleteSnipeTaskButton`)
    .setLabel(`Delete Task`)
    .setStyle(`2`);

// SPAM SETTINGS BUTTON
const inputSpamSettingsButton = new ButtonBuilder()
    .setCustomId(`inputSpamSettingsButton`)
    .setLabel(`Input Spam Settings`)
    .setStyle(`2`);

// SETTINGS BUTTONS
const inputPrivateKeyButton = new ButtonBuilder()
    .setCustomId(`inputPrivateKeyButton`)
    .setLabel(`Input Private Key`)
    .setStyle(`2`);

const deployProxyContractButton = new ButtonBuilder()
    .setCustomId(`deployProxyContractButton`)
    .setLabel(`Deploy Proxy Contract`)
    .setStyle(`2`);

const setSpamSettingsButton = new ButtonBuilder()
    .setCustomId(`setSpamSettingsButton`)
    .setLabel(`Set Spam Settings`)
    .setStyle(`2`);

const settingsButton = new ButtonBuilder()
    .setCustomId(`settingsButton`)
    .setEmoji(`⚙️`)
    .setStyle(`2`);

const confirmPrivateKeyButton = new ButtonBuilder()
    .setCustomId(`confirmPrivateKeyButton`)
    .setLabel(`Input Private Key`)
    .setStyle(`2`);

const deleteMyDataButton = new ButtonBuilder()
    .setCustomId(`deleteMyDataButton`)
    .setLabel(`Delete My Data`)
    .setStyle(`4`);

const deployProxyContractConfirmButton = new ButtonBuilder()
    .setCustomId(`deployProxyContractConfirmButton`)
    .setLabel(`Deploy my Proxy Contract`)
    .setStyle(`3`);

const confirmWalletBuyButton = new ButtonBuilder()
    .setCustomId(`confirmWalletBuyButton`)
    .setLabel(`Confirm Buy`)
    .setStyle(`3`);

const cancelButton = new ButtonBuilder()
    .setCustomId(`cancelButton`)
    .setLabel(`Cancel`)
    .setStyle(`4`);

// BUTTONS WITH INPUTS
function getPageButtonsRow(page, maxPage, menu) { // Returns an action row that contains the page buttons. Menu should be either `SnipeTasks` or `SpamTasks`
    let leftButton = new ButtonBuilder()
        .setCustomId(`pageButton_${menu}_${parseInt(page) - 1}`) // Setting the customid to pageButton_[menu selected]_[page that the button will go to]
        .setStyle(`2`)
        .setEmoji(`◀️`);
    let middleButton = new ButtonBuilder()
        .setLabel(`Page ${page} of ${maxPage}`)
        .setCustomId(`middleButton`)
        .setStyle(`2`)
        .setDisabled(true);
    let rightButton = new ButtonBuilder()
        .setCustomId(`pageButton_${menu}_${parseInt(page) + 1}`)// Setting the customid to pageButton_[menu selected]_[page that the button will go to]
        .setStyle(`2`)
        .setEmoji(`▶️`);
    let searchButton = new ButtonBuilder()
        .setCustomId(`search${menu}Button`)
        .setEmoji(`🔍`)
        .setStyle(`2`);
    if (page == 1) leftButton.setDisabled(true); // Disabling the left button if the page is the first page.
    if (page == maxPage) rightButton.setDisabled(true); // Disabling the right button if the page is the last page
    let buttonActionRow = new ActionRowBuilder().addComponents(leftButton, middleButton, rightButton, searchButton, homeButton);
    return buttonActionRow;
}

function getSellButtonsRow(keyAddress, keyBalance, menu) { // Returns an action row that contains the page buttons. Menu should be either `ContractSell` or `WalletSell`
    let sellButtonList = [];
    for (let keyNumber = 0; keyNumber < Math.min(keyBalance, 3); keyNumber++) {
        let sellButton = new ButtonBuilder()
            .setCustomId(`${menu}-${keyAddress}-${keyNumber + 1}`) // Setting the customid to ContractSell_menu_keyAddress that the button will go to]
            .setStyle(`2`)
            .setLabel(`${keyNumber + 1}`);
        sellButtonList.push(sellButton);
    }
    if (keyBalance > 4) {
        let lastButton = new ButtonBuilder()
            .setCustomId(`${menu}-${keyAddress}-${keyBalance}`) // Setting the customid to ContractSell_menu_keyAddress that the button will go to]
            .setStyle(`2`)
            .setLabel(`${keyBalance}`);
        sellButtonList.push(lastButton, homeButton);
    } else {
        sellButtonList.push(homeButton);
    }
    let buttonActionRow = new ActionRowBuilder().addComponents(...sellButtonList);
    return buttonActionRow;
}

function getBuyButtonsRow(keyAddress, menu) { // Returns an action row that contains the page buttons. Menu should be either `ContractBuy` or `WalletBuy`
    let buyButtonList = [];
    for (let keyNumber = 0; keyNumber < 5; keyNumber++) {
        let sellButton = new ButtonBuilder()
            .setCustomId(`${menu}-${keyAddress}-${keyNumber + 1}`) // Setting the customid to ContractBuy_menu_keyAddress that the button will go to]
            .setStyle(`2`)
            .setLabel(`${keyNumber + 1}`);
        buyButtonList.push(sellButton);
    }
    let buttonActionRow = new ActionRowBuilder().addComponents(...buyButtonList);
    return buttonActionRow;
}

function getQuickSpamButtonsRow(keyAddress, twitterHandleInput) {
    const startSpamTask_4_Button = new ButtonBuilder()
        .setCustomId(`startSpamTask-4-${keyAddress}-${twitterHandleInput}`)
        .setLabel(`🔑4 - Sweep to 0.001 (Total 0.0021)`)
        .setStyle(`2`);
    const startSpamTask_8_Button = new ButtonBuilder()
        .setCustomId(`startSpamTask-8-${keyAddress}-${twitterHandleInput}`)
        .setLabel(`🔑8 - Sweep to 0.004 (Total 0.015)`)
        .setStyle(`2`);
    const startSpamTask_12_Button = new ButtonBuilder()
        .setCustomId(`startSpamTask-12-${keyAddress}-${twitterHandleInput}`)
        .setLabel(`🔑12 - Sweep to 0.009 (Total 0.045)`)
        .setStyle(`2`);
    const startSpamTask_PriceInput = new ButtonBuilder()
        .setCustomId(`startSpamTask-PriceInput-${keyAddress}-${twitterHandleInput}`)
        .setLabel(`Input Sweep Price`)
        .setStyle(`2`);
    let buttonActionRow = new ActionRowBuilder().addComponents(startSpamTask_4_Button, startSpamTask_8_Button, startSpamTask_12_Button, startSpamTask_PriceInput);
    return buttonActionRow;
}


module.exports = {
    taskTypeOptions, createTaskButton, manageTasksButton, sellKeysButton, getPageButtonsRow, deleteSpamTaskButton, homeButton,
    inputSpamSettingsButton, changeSnipeTaskSweepPriceButton, changeSnipeTaskPrioButton, deleteSnipeTaskButton, getSellButtonsRow, inputSpamWalletButton, changeSpamTaskSweepPriceButton,
    settingsButton, inputPrivateKeyButton, deployProxyContractButton, setSpamSettingsButton, confirmPrivateKeyButton, confirmPrivateKeyButton, deleteMyDataButton,
    deployProxyContractConfirmButton, getBuyButtonsRow, confirmWalletBuyButton, cancelButton, sellFromOptions, depositButton, withdrawButton, getQuickSpamButtonsRow
};