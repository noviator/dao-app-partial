require("@nomiclabs/hardhat-waffle");
require("dotenv").config();

const ALCHEMY_RPC_URL = process.env.ALCHEMY_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

module.exports = {
    solidity: "0.8.9",
    networks: {
        goerli: {
            url: ALCHEMY_RPC_URL,
            accounts: [PRIVATE_KEY],
        },
    },
};