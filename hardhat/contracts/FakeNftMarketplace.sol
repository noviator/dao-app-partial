// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract FakeNFTMarketplace {
    // to maintain a mapping of Fake TokenID to Owner addresses
    mapping(uint256 => address) public tokens;
    // purchase price for each fake NFT
    uint256 nftPrice = 0.01 ether;

    // _tokenID is the Fake TokenID to be purchased
    // purchase() accepts ETH and marks the address of the owner of the tokenId as the caller address
    function purchase(uint256 _tokenId) external payable {
        require(msg.value == nftPrice, "This NFT costs 0.01 ether");
        tokens[_tokenId] = msg.sender;
    }

    // returns price of the NFT
    function getPrice() external view returns (uint256) {
        return nftPrice;
    }

    // checks the given tokenId has already been sold or not
    function available(uint256 _tokenId) external view returns (bool) {
        // address(0) = 0x0000000000000000000000000000000000000000
        // This is the default value for addresses in Solidity
        return tokens[_tokenId] == address(0);
    }
}