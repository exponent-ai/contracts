const hre = require("hardhat");
const ethers = hre.ethers;

const { kyberTakeOrderArgs } = require("@enzymefinance/protocol");

const {
  initMainnetEnv,
  seedBalance,
} = require("../test/utils/integration-test-setup");
const { randomAddress } = require("../test/utils/address");

const kyberVenue = "0xb2316B7a1398c022F4f1fa44Ef1a95256217D8fd";
const usdcAddress = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const usdcETHFeed = "0x986b5E1e1755e3C2440e960477f25201B0a8bbD4";
const btcAddress = "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599";
const btcETHFeed = "0xdeb288F737066589598e9214E782fa5A8eD689e8";

async function main() {
  const [admin, settler, venueWhitelister, bob] = await ethers.getSigners();
  const contracts = await initMainnetEnv();

  // Seed balances
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
  await seedBalance({
    ticker: "WETH",
    contract: contracts.WETH,
    to: bob.address,
    amount: "100000000000000000000",
  });
  await seedBalance({
    ticker: "USDC",
    contract: contracts.USDC,
    to: bob.address,
    amount: "100000000",
  });
  console.log("Admin and Bob account seeded with WETH and USDC.");
  console.log("Admin: ", admin.address);
  console.log("Bob: ", bob.address);

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

  // Deploy Main
  const Main = await ethers.getContractFactory("XPNMain", {
    libraries: {
      XPNUtils: util.address,
    },
  });
  const main = await Main.deploy(constructorArgs, "EX-ETH", "EX-ETH");
  await main.deployed();
  console.log("XPNMain deployed to:", main.address);

  // Create signals
  await simpleSignal.registerSignal("testsignal", "Simple", [
    "WETH",
    "BTC",
    "USDC",
  ]);
  await simpleSignal.submitSignal(
    "testsignal",
    ["WETH", "BTC", "USDC"],
    [1, 0, 1],
    "0x"
  );
  console.log("Signal created");

  // Whitelist assets
  const assetWhitelisterRole = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("ASSET_WHITELIST_ROLE")
  );
  await main.grantRole(assetWhitelisterRole, admin.address);

  await main.whitelistAsset(btcAddress);
  await main.addAssetFeedConfig("BTC", btcAddress, btcETHFeed);

  await main.whitelistAsset(usdcAddress);
  await main.addAssetFeedConfig("USDC", usdcAddress, usdcETHFeed);

  await main.whitelistAsset(wethAddress);
  await main.addAssetFeedConfig("WETH", wethAddress, randomAddress());
  console.log("Assets whitelisted");

  await main.swapSignal(simpleSignal.address, "testsignal");
  console.log("Signal set");

  await main.connect(admin).initializeFundConfig();
  console.log("Initialized fund config");

  // Whitelist venue
  const venueWhitelisterRole = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("VENUE_WHITELIST_ROLE")
  );
  await main
    .connect(admin)
    .grantRole(venueWhitelisterRole, venueWhitelister.address);
  await main.connect(venueWhitelister).whitelistVenue(kyberVenue);
  console.log("Kyber venue whitelisted");

  // Initial vault deposit
  const depositAmount = ethers.utils.parseUnits("5", 18);
  await contracts.WETH.connect(admin).approve(main.address, depositAmount);
  console.log("Admin approved for initial deposit");
  await main.connect(admin).deposit(depositAmount);
  console.log("Admin has made the vaults first deposit");

  // Sumbit trade
  const tradeAmount = "3608000000";
  const kyberArgs = kyberTakeOrderArgs({
    incomingAsset: contracts.USDC.address,
    minIncomingAssetAmount: tradeAmount,
    outgoingAsset: contracts.WETH.address,
    outgoingAssetAmount: ethers.utils.parseEther("2"),
  });
  await main
    .connect(settler)
    .submitTradeOrders(Array.of(kyberArgs), Array.of(kyberVenue));
  console.log("Trade submitted to Kyber");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
