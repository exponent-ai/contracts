import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-solhint";
import { task } from "hardhat/config";
import "hardhat-gas-reporter";
import "hardhat-abi-exporter";
import "solidity-coverage";

const { ALCHEMY_APIKEY, KOVAN_PRIVATE_KEY } = process.env;

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
