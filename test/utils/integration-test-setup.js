require("dotenv").config();
const hre = require("hardhat");
const ethers = hre.ethers;

const contracts = [
  { name: "USDC", address: process.env.USDC_ADDRESS, abi: "ERC20" },
  { name: "WETH", address: process.env.WETH_ADDRESS, abi: "ERC20" },
  {
    name: "ORACLE_USDC_ETH",
    address: process.env.ORACLE_USDC_WETH,
    abi: "AggregatorV3Interface",
  },
  {
    name: "ENZYME_DEPLOYER",
    address: process.env.ENZYME_DEPLOYER,
    abi: "IFundDeployer",
  },
  {
    name: "ENZYME_COMPTROLLER",
    address: process.env.ENZYME_COMPTROLLER,
    abi: "IComptroller",
  },
  {
    name: "ENZYME_INT_MANAGER",
    address: process.env.ENZYME_INT_MANAGER,
    abi: "IIntegrationManager",
  },
  {
    name: "ENZYME_ASSET_ADAPTER",
    address: process.env.ENZYME_ASSET_ADAPTER,
    abi: "ITrackedAssetAdapter",
  },
  {
    name: "ENZYME_POLICY_MANAGER",
    address: process.env.ENZYME_POLICY_MANAGER,
    abi: "IPolicyManager",
  },
  {
    name: "ENZYME_INVESTOR_WHITELIST",
    address: process.env.ENZYME_INVESTOR_WHITELIST,
  },
  {
    name: "ENZYME_AAVE_ADAPTER",
    address: process.env.ENZYME_AAVE_ADAPTER,
  },
  {
    name: "ENZYME_DISPATCHER",
    address: process.env.ENZYME_DISPATCHER,
  },
  {
    name: "AUSDC",
    address: process.env.AUSDC_ADDRESS,
  },
];

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
  return Object.fromEntries(gotContracts);
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
    WETH: "0x56178a0d5f301baf6cf3e1cd53d9863437345bf9",
    USDC: "0xab7677859331f95f25a3e7799176f7239feb5c44",
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
