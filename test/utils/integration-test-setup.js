// Copyright (C) 2021 Exponent

// This file is part of Exponent.

// Exponent is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Exponent is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Exponent.  If not, see <http://www.gnu.org/licenses/>.

require("dotenv").config();
const hre = require("hardhat");
const ethers = hre.ethers;
const { contracts, wallets, transactions } = require("./integration-config.js");

async function initMainnetEnv() {
  const loadedContracts = contracts.map(async function (contract) {
    if ("abi" in contract) {
      const target = await hre.ethers.getContractAt(
        contract.abi,
        contract.address
      );
      return [contract.name, target];
    } else {
      // return raw addres instead
      return [contract.name, { address: contract.address }];
    }
  });
  const gotContracts = await Promise.all(loadedContracts);
  const gotWallets = wallets.map((wallet) => [
    wallet.name,
    { address: wallet.address },
  ]);
  const gotTransactions = transactions.map((tx) => [tx.name, tx.hash]);
  return [
    Object.fromEntries(gotContracts),
    Object.fromEntries(gotWallets),
    Object.fromEntries(gotTransactions),
  ];
}

async function cleanUp({ tokens, users }) {
  Promise.all(
    tokens.map((token) => {
      users.map(async (user) => {
        const balance = await token.balanceOf(user.address);
        await token.transfer(token.address, balance);
      });
    })
  );
}

async function seedBalance({ ticker, contract, to, amount }) {
  const faucetAddresses = {
    WETH: process.env.WETH_FAUCET,
    USDC: process.env.USDC_FAUCET,
  };
  try {
    const faucetAddress = faucetAddresses[ticker];

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [faucetAddress],
    });
    const signer = await ethers.provider.getSigner(faucetAddress);

    await contract.connect(signer).transfer(to, amount);

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [faucetAddress],
    });
  } catch (e) {
    throw e;
  }
}

async function setSnapshot() {
  try {
    await network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: process.env.ETH_RPC,
            blockNumber: parseInt(process.env.BLOCK_NUMBER),
          },
        },
      ],
    });
  } catch (e) {
    throw e;
  }
}

async function getDeployedContractBytes(
  txHash,
  interfaceName,
  deployer,
  contractModifier = null
) {
  const tx = await ethers.provider.getTransaction(txHash); // transaction used to deploythe contract
  const artifacts = await hre.artifacts.readArtifact(interfaceName);
  const contractFactory = new ethers.ContractFactory(
    artifacts.abi,
    contractModifier == null ? tx.data : contractModifier(tx.data)
  );

  // deploy an exact copy of the contract fetched
  return await contractFactory.connect(deployer).deploy();
}

module.exports = {
  initMainnetEnv,
  seedBalance,
  cleanUp,
  setSnapshot,
  getDeployedContractBytes,
};
