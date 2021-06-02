require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");
require("@nomiclabs/hardhat-solhint");
require("hardhat-abi-exporter");
require("solidity-coverage");

const { ALCHEMY_APIKEY, KOVAN_PRIVATE_KEY } = process.env;

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
  solidity: {
    compilers: [
      {
        version: "0.8.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks:
    ALCHEMY_APIKEY && KOVAN_PRIVATE_KEY
      ? {
          kovan: {
            url: `https://eth-kovan.alchemyapi.io/v2/${ALCHEMY_APIKEY}`,
            accounts: [`0x${KOVAN_PRIVATE_KEY}`],
            gas: "auto",
          },
        }
      : {},
  abiExporter: {
    path: "./data/abi",
    clear: true,
    flat: true,
    only: ["IXPN", "IIntegrationManager"],
    spacing: 2,
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
  },
  mocha: {
    reporter: process.env.TEST_REPORT ? "json" : "spec",
  },
};
