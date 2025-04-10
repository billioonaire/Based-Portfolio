//SPDX-License-Identifier: MIT
//IN BILLIONAIRE WE TRUST

pragma solidity ^0.8.7;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
interface IFriendtechSharesV1 {
    // Variables
    function protocolFeeDestination() external view returns (address);
    function protocolFeePercent() external view returns (uint256);
    function subjectFeePercent() external view returns (uint256);
    function sharesBalance(address sharesSubject, address holder) external view returns (uint256);
    function sharesSupply(address sharesSubject) external view returns (uint256);

    // Functions
    function setFeeDestination(address _feeDestination) external;
    function setProtocolFeePercent(uint256 _feePercent) external;
    function setSubjectFeePercent(uint256 _feePercent) external;
    function getPrice(uint256 supply, uint256 amount) external pure returns (uint256);
    function getBuyPrice(address sharesSubject, uint256 amount) external view returns (uint256);
    function getSellPrice(address sharesSubject, uint256 amount) external view returns (uint256);
    function getBuyPriceAfterFee(address sharesSubject, uint256 amount) external view returns (uint256);
    function getSellPriceAfterFee(address sharesSubject, uint256 amount) external view returns (uint256);
    function buyShares(address sharesSubject, uint256 amount) external payable;
    function sellShares(address sharesSubject, uint256 amount) external payable;

    // Events
    event Trade(address indexed trader, address indexed subject, bool isBuy, uint256 shareAmount, uint256 ethAmount, uint256 protocolEthAmount, uint256 subjectEthAmount, uint256 supply);
}

contract FriendTechBot is IERC721Receiver, IERC1155Receiver {

    IFriendtechSharesV1 public friendtechInstance;
    address immutable public contractDeployer;

    constructor() {
        contractDeployer = tx.origin;
        friendtechInstance = IFriendtechSharesV1(0xCF205808Ed36593aa40a44F10c7f7C2F67d4A4d4);
    }
    fallback() external payable {
    }

    function buyShares(uint256 maxAmountPerShareInEth, address subject) public onlyContractDeployer returns (uint256) {

        uint256 sharesSupply = friendtechInstance.sharesSupply(subject);

        require(sharesSupply > 0, "Not Live Yet");

        uint256 sharesBought = 0;

        while (true) {

            uint256 currentBuyPrice = friendtechInstance.getBuyPriceAfterFee(subject, 1);

            if (currentBuyPrice > maxAmountPerShareInEth) break;
            if (currentBuyPrice > address(this).balance) break;

            friendtechInstance.buyShares{value: currentBuyPrice}(subject, 1);
            sharesBought++;

        }
    return sharesBought;

    }

    function sellShares(uint256 amount, address subject) public onlyContractDeployer {

            friendtechInstance.sellShares{value: 0}(subject, amount);
    }

      function execute(address _contract, bytes calldata _cmd, uint256 _value) external payable onlyContractDeployer {
      
        _contract.call{value: _value}(_cmd);

      }

    function onERC721Received(
            address operator,
            address from,
            uint256 tokenId,
            bytes calldata data
        ) public override returns (bytes4) {
            return this.onERC721Received.selector;
      }

    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external override returns (bytes4) {
            return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external override returns (bytes4){
            return this.onERC1155Received.selector;
    }
    function supportsInterface(bytes4 interfaceId) external override view returns (bool) {

        return interfaceId == type(IERC165).interfaceId;

    }
    function withdraw() external onlyContractDeployer {

       //uint256 balance = address(this).balance;

       payable(contractDeployer).transfer(address(this).balance);

    }

    modifier onlyContractDeployer() {
        require(tx.origin == contractDeployer, "Not your contract young man!");
        _;
    }

}

contract FriendTechRouter is Ownable {

    mapping(address => address) public friendTechBotMap;

    function deployContract() external {
      
      require(friendTechBotMap[tx.origin] == address(0));

            FriendTechBot c = new FriendTechBot();
            friendTechBotMap[tx.origin] = (address(c));
    }

    function buyShares(uint256 maxAmountPerShareInEth, address subject) external returns (uint256) {
        require(friendTechBotMap[tx.origin] != address(0), "Bot contract not deployed");
        uint256 sharesBought = FriendTechBot(payable(friendTechBotMap[tx.origin])).buyShares(maxAmountPerShareInEth, subject);
        return sharesBought;
    }

    function sellShares(uint256 amount, address subject) external {
        require(friendTechBotMap[tx.origin] != address(0), "Bot contract not deployed");
        FriendTechBot(payable(friendTechBotMap[tx.origin])).sellShares(amount, subject);
    }

    function execute(address _contract, bytes calldata _cmd, uint256 _value) external payable {
        require(friendTechBotMap[tx.origin] != address(0), "Bot contract not deployed");
        FriendTechBot(payable(friendTechBotMap[tx.origin])).execute{value: msg.value}(_contract, _cmd, _value);
    }

    function withdrawFromBot() external {
        require(friendTechBotMap[tx.origin] != address(0), "Bot contract not deployed");
        FriendTechBot(payable(friendTechBotMap[tx.origin])).withdraw();
    }



}