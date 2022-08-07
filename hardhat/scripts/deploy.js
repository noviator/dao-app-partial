const { ethers } = require("hardhat")
require("dotenv").config();
const { MYNFT_NFT_CONTRACT_ADDRESS} = require("../constants");

async function main() {
  // Deploy the FakeNFTMarketplace contract first
  const FakeNFTMarketplace = await ethers.getContractFactory("FakeNFTMarketplace");
  const fakeNftMarketplace = await FakeNFTMarketplace.deploy();
  await fakeNftMarketplace.deployed();

  console.log(`FakeNFTMarketplace deployed to: ${fakeNftMarketplace.address}`);

  // Deploy the myNftDAO contract
  const MyNftDAO = await ethers.getContractFactory("myNftDAO");
  const myNftDAO = await MyNftDAO.deploy( fakeNftMarketplace.address, MYNFT_NFT_CONTRACT_ADDRESS,
    {
      value: ethers.utils.parseEther("0.1"),
    }
  );
  await myNftDAO.deployed();

  console.log("myNftDAO deployed to: ", myNftDAO.address);

}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })