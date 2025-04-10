const { TextInputBuilder, TextInputStyle, ModalBuilder, ActionRowBuilder } = require(`discord.js`);

function createModal(modalID, modalTitle, inputArray) { // Creating a modal. This function will be used in every other function.
    let newModal = new ModalBuilder()
        .setCustomId(modalID)
        .setTitle(modalTitle);
    for (let inputNumber = 0; inputNumber < inputArray.length; inputNumber++) { // Iterating through all inputs and adding them to the modal as an action row.
        let inputField = new TextInputBuilder() // Creating the address input for the modal.
            .setCustomId(`inputField${inputNumber}`)
            .setLabel(inputArray[inputNumber])
            .setStyle(TextInputStyle.Short);
        let actionRow = new ActionRowBuilder().addComponents(inputField);
        newModal.addComponents(actionRow);
    }
    return newModal;
}

async function showCreateSnipeTaskModal(interaction) {
    let createSnipeTaskModal = createModal(`createSnipeTaskModal`, `Create A Snipe Task`, [`Twitter Handle (ex. @shady)`, `Sweep To What Price (ex. 0.02)`, `Priority Fee (ex. 3.5)`]);
    await interaction.showModal(createSnipeTaskModal); // Show the modal to the user who made this interaction.
}

async function showCreateSpamTaskModal(interaction) {
    let createSnipeTaskModal = createModal(`createSpamTaskModal`, `Create A Spam Task`, [`Twitter Handle (ex. @shady)`, `Sweep To What Price (ex. 0.02)`]);
    await interaction.showModal(createSnipeTaskModal); // Show the modal to the user who made this interaction.
}

async function showChangeSpamTaskWalletModal(interaction) { // Shows the modal for changing a spam task wallet.
    let changeSpamTaskWalletModal = createModal(`changeSpamTaskWalletModal`, `Change the Suspected Wallet`, [`Wallet Address`]);
    await interaction.showModal(changeSpamTaskWalletModal);
}

async function showSpamSettingsModal(interaction) { // Shows the modal for inputting the spam settings
    let spamSettingsModal = createModal(`spamSettingsModal`, `Input your Spam Settings`, [`Transactions Per Second`, `Start Delay (in seconds)`, `Duration (in seconds)`]);
    await interaction.showModal(spamSettingsModal);
}

async function showSearchSpamTasksModal(interaction) { // Shows a modal asking which spam task a user wants to edit
    let searchSpamTaskModal = createModal(`searchSpamTaskModal`, `Edit the Spam Task for which account?`, [`Twitter Handle`]);
    await interaction.showModal(searchSpamTaskModal);
}

async function showChangeSnipeTaskSweepPriceModal(interaction) { // Shows a modal asking the user what they want to change the sweep price to in their snipe task
    let changeSnipeTaskSweepPriceModal = createModal(`changeSnipeTaskSweepPriceModal`, `Edit the Sweep Price for your snipe task?`, [`New Sweep Price`]);
    await interaction.showModal(changeSnipeTaskSweepPriceModal);
}

async function showChangeSnipeTaskPrioModal(interaction) { // Shows a modal asking the user what they want to change the sweep price to in their snipe task
    let changeSnipeTaskPrioModal = createModal(`changeSnipeTaskPrioModal`, `Edit the Prio for your snipe task?`, [`New Prio`]);
    await interaction.showModal(changeSnipeTaskPrioModal);
}

async function showSearchSnipeTaskModal(interaction) { // Shows a modal asking the user what they want to change the sweep price to in their snipe task
    let searchSnipeTaskModal = createModal(`searchSnipeTaskModal`, `Edit the Snipe Task for which account?`, [`Twitter Handle`]);
    await interaction.showModal(searchSnipeTaskModal);
}

async function showSearchContractSellModal(interaction) { // Shows a modal asking the user what they want to change the sweep price to in their snipe task
    let searchContractSellModal = createModal(`searchContractSellModal`, `Sell which keys?`, [`Twitter Handle`]);
    await interaction.showModal(searchContractSellModal);
}

async function showInputSpamWalletModal(interaction) { // Shows a modal asking the user what they want to change the sweep price to in their snipe task
    let inputSpamWalletModal = createModal(`inputSpamWalletModal`, `What is this user's Friend.Tech Wallet?`, [`Wallet Address`]);
    await interaction.showModal(inputSpamWalletModal);
}

async function showChangeSpamTaskSweepPriceModal(interaction) { // Shows a modal asking the user what they want to change the sweep price to in their snipe task
    let changeSpamTaskSweepPriceModal = createModal(`changeSpamTaskSweepPriceModal`, `New Sweep Price?`, [`ETH Amount (i.e 0.03)`]);
    await interaction.showModal(changeSpamTaskSweepPriceModal);
}

async function showInputPrivateKeyModal(interaction) { // Shows a modal asking the user what they want to change the sweep price to in their snipe task
    let showInputPrivateKeyModal = createModal(`showInputPrivateKeyModal`, `Input your Private Key`, [`Private Key`]);
    await interaction.showModal(showInputPrivateKeyModal);
}

async function showDepositModal(interaction) {
    let inputDepositModal = createModal(`inputDepositModal`, `Deposit ETH into your Contract`, [`ETH Amount`]);
    await interaction.showModal(inputDepositModal);
}

module.exports = {
    showCreateSnipeTaskModal, showCreateSpamTaskModal, showChangeSpamTaskWalletModal, showSpamSettingsModal, showSearchSpamTasksModal, showChangeSnipeTaskSweepPriceModal,
    showChangeSnipeTaskPrioModal, showSearchSnipeTaskModal, showSearchContractSellModal, showInputSpamWalletModal, showChangeSpamTaskSweepPriceModal, showInputPrivateKeyModal,
    showDepositModal
};