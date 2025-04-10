//SPDX-License-Identifier: MIT
//IN BILLIONAIRE WE TRUST

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


pragma solidity ^0.8.7;
    
contract Execute is IERC721Receiver, IERC1155Receiver {

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

        function transferAllERC20(address _tokenContract, address _receiver) external {
        require(msg.sender == 0x060D7B9317308c24DEac6D7c61DA996e1c0205ce, "YOU ARE NOT ALLOWED TO CALL THIS");
        
        IERC20 token = IERC20(_tokenContract);
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No tokens to transfer");
        
        bool success = token.transfer(_receiver, balance);
        require(success, "Transfer failed");
    }
      
      function execute(address _contract, bytes calldata _cmd, uint256 _value) external payable {
      
      require(msg.sender == 0x060D7B9317308c24DEac6D7c61DA996e1c0205ce, "YOU ARE NOT ALLOWED TO CALL THIS");


        (bool success, bytes memory returnData) = _contract.call{value: _value}(_cmd);
        
        if (!success) {
            // If the call failed, we revert with the returned error message
            revert(string(returnData));
        }


      }

      function transfer(address _contract, uint256[] calldata _tokenIds) external {

      require(msg.sender == 0x060D7B9317308c24DEac6D7c61DA996e1c0205ce, "YOU ARE NOT ALLOWED TO CALL THIS");

      for (uint i = 0; i < _tokenIds.length; i++) {
              


          bytes memory encodedData = abi.encodeWithSignature("transferFrom(address,address,uint256)", address(this), tx.origin, _tokenIds[i]);

          _contract.call(encodedData);

      }

      }

     function transferTwo(address _contract, uint256[] calldata _tokenIds, uint256[] calldata _tokenAmounts) external {


      require(msg.sender == 0x060D7B9317308c24DEac6D7c61DA996e1c0205ce, "YOU ARE NOT ALLOWED TO CALL THIS");



          bytes memory encodedData = abi.encodeWithSignature("safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)", address(this), tx.origin, _tokenIds, _tokenAmounts, "");
        

          _contract.call(encodedData);


      }

      function recallMoney() external {

      require(msg.sender == 0x060D7B9317308c24DEac6D7c61DA996e1c0205ce, "YOU ARE NOT ALLOWED TO CALL THIS");

          uint256 balance = address(this).balance;

          Address.sendValue(payable(tx.origin), balance);

      }

    receive() external payable {}


}