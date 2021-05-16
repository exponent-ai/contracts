require("dotenv").config();
require("hardhat-gas-reporter");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-solhint");
require("hardhat-tracer");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
    hardhat: {
      forking: {
        url: process.env.ETH_RPC,
        blocknumber: parseInt(process.env.BLOCK_NUMBER),
      },
    },
  },
  solidity: "0.8.0",
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
  },
  mocha: {
    reporter: process.env.TEST_REPORT ? "json" : "spec",
  },
};
