const hre = require("hardhat");
const ethers = hre.ethers;

const { initMainnetEnv } = require("../test/utils/integration-test-setup");

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
  const main = await Main.deploy(
    constructorArgs,
    contracts.WETH.address,
    "EX-ETH",
    "EX-ETH"
  );
  await main.deployed();
  console.log("XPNMain deployed to:", main.address);

  await main.connect(admin).initializeFundConfig();
  console.log("Initialized fund config");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
