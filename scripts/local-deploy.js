const hre = require("hardhat");
const ethers = hre.ethers;

const {
  initMainnetEnv,
  seedBalance,
} = require("../test/utils/integration-test-setup");

async function main() {
  const [admin, settler] = await ethers.getSigners();

  const contracts = await initMainnetEnv();

  // Deploy Signal
  const Signal = await ethers.getContractFactory("XPNSignal");
  const simpleSignal = await Signal.deploy();
  await simpleSignal.deployed();
  console.log("XPNSignal deployed to:", simpleSignal.address);

  // Deploy XPNUtils
  const Util = await ethers.getContractFactory("XPNUtils");
  const util = await Util.deploy();
  await util.deployed();
  console.log("XPNUtils deployed to:", util.address);

  const constructorArgs = [
    admin.address,
    settler.address,
    simpleSignal.address,
    contracts.WETH.address,
    "WETH",
    contracts.ENZYME_DEPLOYER.address,
    contracts.ENZYME_INT_MANAGER.address,
    contracts.ENZYME_ASSET_ADAPTER.address,
    contracts.ENZYME_POLICY_MANAGER.address,
    contracts.ENZYME_INVESTOR_WHITELIST.address,
    ethers.constants.AddressZero,
    ethers.constants.AddressZero,
    [],
    "EX-ETH",
  ];

  const Main = await ethers.getContractFactory("XPNMain", {
    libraries: {
      XPNUtils: util.address,
    },
  });
  const main = await Main.deploy(constructorArgs, "EX-ETH", "EX-ETH");
  await main.deployed();
  console.log("XPNMain deployed to:", main.address);

  const assetWhitelisterRole = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("ASSET_WHITELIST_ROLE")
  );
  await main.grantRole(assetWhitelisterRole, admin.address);
  const usdcAddress = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
  const usdcETHFeed = "0x986b5E1e1755e3C2440e960477f25201B0a8bbD4";
  await main.whitelistAsset(usdcAddress);
  await main.addAssetFeedConfig("USDC", usdcAddress, usdcETHFeed);
  await simpleSignal.registerSignal("testsignal", "Simple", ["WETH", "USDC"]);

  await simpleSignal.submitSignal("testsignal", ["WETH", "USDC"], [1, 0], "0x");

  await main.swapSignal(simpleSignal.address, "testsignal");

  await main.connect(admin).initializeFundConfig();
  console.log("Initialized fund config");

  await seedBalance({
    ticker: "WETH",
    contract: contracts.WETH,
    to: admin.address,
    amount: "100000000000000000000",
  });
  await seedBalance({
    ticker: "USDC",
    contract: contracts.USDC,
    to: admin.address,
    amount: "100000000",
  });
  console.log("Admin account seeded with WETH and USDC: ", admin.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
