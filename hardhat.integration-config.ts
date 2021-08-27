import "tsconfig-paths/register";
import * as dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-solhint";
import { task } from "hardhat/config";
import "hardhat-gas-reporter";
import "hardhat-abi-exporter";
import "solidity-coverage";
import "hardhat-tracer";

dotenv.config();

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

module.exports = {
  networks: {
    hardhat: {
      chainId: 1,
      forking: {
        url: process.env.ETH_RPC,
        blocknumber: parseInt(process.env.BLOCK_NUMBER as string),
      },
    },
  },
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
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
  },
  mocha: {
    reporter: process.env.TEST_REPORT ? "json" : "spec",
  },
};
