require("dotenv").config();

const contracts = [
  { name: "USDC", address: process.env.USDC_ADDRESS, abi: "ERC20" },
  { name: "WETH", address: process.env.WETH_ADDRESS, abi: "ERC20" },
  { name: "WBTC", address: process.env.WBTC_ADDRESS, abi: "ERC20" },
  {
    name: "ORACLE_USDC_ETH",
    address: process.env.ORACLE_USDC_ETH,
    abi: "AggregatorV3Interface",
  },
  {
    name: "ORACLE_WBTC_ETH",
    address: process.env.ORACLE_WBTC_ETH,
    abi: "AggregatorV3Interface",
  },
  {
    name: "KYBER",
    address: process.env.KYBER_ADDRESS,
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
    name: "ENZYME_FEE_MANAGER",
    address: process.env.ENZYME_FEE_MANAGER,
  },
  {
    name: "ENZYME_PERFORMANCE_FEE",
    address: process.env.ENZYME_PERFORMANCE_FEE,
  },
  {
    name: "ENZYME_MANAGEMENT_FEE",
    address: process.env.ENZYME_MANAGEMENT_FEE,
  },
  {
    name: "AUSDC",
    address: process.env.AUSDC_ADDRESS,
  },
];

const wallets = [
  {
    name: "ENZYME_DISPATCHER_OWNER",
    address: process.env.ENZYME_DISPATCHER_OWNER,
  },
];

const transactions = [
  {
    name: "ENZYME_DEPLOYER_DEPLOYMENT",
    hash: process.env.ENZYME_DEPLOYER_DEPLOYMENT,
  },
  {
    name: "ENZYME_COMPTROLLERLIB_DEPLOYMENT",
    hash: process.env.ENZYME_COMPTROLLERLIB_DEPLOYMENT,
  },
];

module.exports = {
  contracts,
  wallets,
  transactions,
};
