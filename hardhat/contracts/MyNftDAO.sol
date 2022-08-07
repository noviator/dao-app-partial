// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IFakeNFTMarketplace {
    function getPrice() external view returns (uint256); // get the price of the NFT
    function available(uint256 _tokenId) external view returns (bool); // _tokenId purchased or not
    function purchase(uint256 _tokenId) external payable; // purchase nft from fake nft marketplace
}

interface IMyNFT {
    function balanceOf(address owner) external view returns (uint256); // number of NFTs owned by owner

    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256);// returns a tokenID at given index for owner
}

contract myNftDAO is Ownable {
    struct Proposal {
        uint256 nftTokenId; // tokenId of the NFT to purchase from FakeNFTMarketplace if the proposal passes
        uint256 deadline; // UNIX timestamp till the proposal is active. Proposal can be executed after the deadline has been exceeded.
        uint256 yesVotes;
        uint256 noVotes;
        bool executed; // whether the proposal has been executed or not. cannot be executed before the deadline has been exceeded.
        mapping(uint256 => bool) voters; // myNFT tokenId => bool (true if nft used to cast a vote, false if not).
    }

    // YES = 0 , NO = 1
    enum Vote {
        YES, 
        NO
    }




    mapping(uint256 => Proposal) public proposals; // Id => Proposal
    uint256 public numProposals; // number of proposals

    IFakeNFTMarketplace nftMarketplace;
    IMyNFT MyNFT;

    
    constructor(address _nftMarketplace, address _myNFT) payable {
        //payable => cosntructor can receive ether when deployed

        nftMarketplace = IFakeNFTMarketplace(_nftMarketplace);
        MyNFT = IMyNFT(_myNFT);
    }
    
    modifier nftHolderOnly() {
        // can be called by someone who owns atlest one MyNFT
        require(MyNFT.balanceOf(msg.sender) > 0, "NOT_A_DAO_MEMBER");
        _;
    }

    
    modifier activeProposalOnly(uint256 proposalIndex) {
        // allows a function to be called if the given proposal's deadline has not been exceeded
        require(proposals[proposalIndex].deadline > block.timestamp,"DEADLINE_EXCEEDED");
        _;
    }


    modifier inactiveProposalOnly(uint256 proposalIndex) {
        // allows a function to be called if the given proposal's deadline has been exceeded
        // and if the proposal has not been executed yet.
        require( proposals[proposalIndex].deadline <= block.timestamp, "DEADLINE_NOT_EXCEEDED");
        require( proposals[proposalIndex].executed == false, "PROPOSAL_ALREADY_EXECUTED");
        _;
    }


    function createProposal(uint256 _nftTokenId) external nftHolderOnly returns (uint256){
        require(nftMarketplace.available(_nftTokenId), "NFT_NOT_FOR_SALE");
        // storage - holds data between function calls
        Proposal storage proposal = proposals[numProposals];
        proposal.nftTokenId = _nftTokenId;

        proposal.deadline = block.timestamp + 5 minutes;

        numProposals++;

        // returns the proposal index of the newly created proposal
        return numProposals - 1;
    }



    function voteOnProposal(uint256 proposalIndex, Vote vote) external nftHolderOnly activeProposalOnly(proposalIndex){
        Proposal storage proposal = proposals[proposalIndex];

        uint256 voterNFTBalance = MyNFT.balanceOf(msg.sender);
        uint256 numVotes = 0;

        // calculating number of NFTs owned by voter which haven't already been used for voting on this proposal
        for (uint256 i = 0; i < voterNFTBalance; i++) {
            uint256 tokenId = MyNFT.tokenOfOwnerByIndex(msg.sender, i);
            if (proposal.voters[tokenId] == false) {
                numVotes++;
                proposal.voters[tokenId] = true;
            }
        }
        require(numVotes > 0, "ALREADY_VOTED");

        if (vote == Vote.YES) {
            proposal.yesVotes += numVotes;
        } else {
            proposal.noVotes += numVotes;
        }
    }


    function executeProposal(uint256 proposalIndex) external nftHolderOnly inactiveProposalOnly(proposalIndex){
        Proposal storage proposal = proposals[proposalIndex];

        // if more people support the proposal (i.e. YES votes > NO votes)  purchase nft from FakeNFTMarketplace
        if (proposal.yesVotes > proposal.noVotes) {
            uint256 nftPrice = nftMarketplace.getPrice();
            require(address(this).balance >= nftPrice, "NOT_ENOUGH_FUNDS"); // Check if contract has enough funds to purchase NFT
            nftMarketplace.purchase{value: nftPrice}(proposal.nftTokenId);
        }
        proposal.executed = true;
    }


    function withdrawEther() external onlyOwner {
        // Allows owner to withdraw all ether from the contract
        payable(owner()).transfer(address(this).balance);
    }



    // allows the contract to accept ether directly from a wallet without calling a function
    receive() external payable {}

    fallback() external payable {}


}