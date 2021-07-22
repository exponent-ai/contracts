require("dotenv").config();
const { expect } = require("chai");
const { randomAddress } = require("../utils/address.js");
const {
  seedBalance,
  initMainnetEnv,
  setSnapshot,
} = require("../utils/integration-test-setup.js");
const { kyberTakeOrderArgs } = require("@enzymefinance/protocol");

describe("XPNMain", function () {
  let contracts;
  before("deploy contract", async function () {
    await setSnapshot();
    [
      this.admin,
      this.deployer,
      this.settler,
      this.assetWhitelister,
      this.depositor,
      this.venueWhitelister,
    ] = await ethers.getSigners();
    contracts = await initMainnetEnv();
    const Util = await ethers.getContractFactory("XPNUtils");
    this.util = await Util.deploy();
    await this.util.deployed();
    const Main = await ethers.getContractFactory("XPNMain", {
      libraries: {
        XPNUtils: this.util.address,
      },
    });
    const Signal = await ethers.getContractFactory("XPNSignal");
    this.simpleSignal = await Signal.deploy();
    await this.simpleSignal.deployed();
    await this.simpleSignal.registerSignal("testsignal1", "Simple", [
      "WETH",
      "USDC",
    ]);
    await this.simpleSignal.submitSignal(
      "testsignal1",
      ["WETH", "USDC"],
      [1, 1],
      "0x"
    );

    const constructorArgs = [
      this.admin.address,
      this.settler.address,
      this.simpleSignal.address, // signal address
      contracts.WETH.address,
      "WETH",
      contracts.ENZYME_DEPLOYER.address,
      contracts.ENZYME_INT_MANAGER.address,
      contracts.ENZYME_ASSET_ADAPTER.address,
      contracts.ENZYME_POLICY_MANAGER.address, // policy manager // Missing for CONF
      contracts.ENZYME_INVESTOR_WHITELIST.address, // investor whitelist  // Missing for CONF
      ethers.constants.AddressZero,
      ethers.constants.AddressZero,
      [],
      "EX-ETH",
    ];

    this.main = await Main.deploy(constructorArgs, "EX-ETH", "EX-ETH");
    await this.main.deployed();
    const assetWhitelisterRole = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes("ASSET_WHITELIST_ROLE")
    );
    await this.main.grantRole(assetWhitelisterRole, this.admin.address);
    const usdcAddress = contracts.USDC.address;
    const usdcETHFeed = "0x986b5E1e1755e3C2440e960477f25201B0a8bbD4";
    await this.main.whitelistAsset(usdcAddress);
    await this.main.addAssetFeedConfig("USDC", usdcAddress, usdcETHFeed);
    await this.main.swapSignal(this.simpleSignal.address, "testsignal1");
    await this.main.connect(this.admin).initializeFundConfig();
    await seedBalance({
      ticker: "WETH",
      contract: contracts.WETH,
      to: this.depositor.address,
      amount: "100000000000000000000",
    });
    this.venueWhitelisterRole = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes("VENUE_WHITELIST_ROLE")
    );
    const wethAddress = contracts.WETH.address;
    const wethFeed = ethers.constants.AddressZero; // should not need a feed for weth denom asset
    this.assetWhitelisterRole = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes("ASSET_WHITELIST_ROLE")
    );
    await this.main
      .connect(this.admin)
      .grantRole(this.assetWhitelisterRole, this.assetWhitelister.address);
    await this.main
      .connect(this.assetWhitelister)
      .addAssetFeedConfig("WETH", wethAddress, randomAddress());
    await this.main.connect(this.assetWhitelister).whitelistAsset(wethAddress);

    await this.main
      .connect(this.admin)
      .grantRole(this.venueWhitelisterRole, this.venueWhitelister.address);
    await this.main
      .connect(this.venueWhitelister)
      .whitelistVenue(process.env.KYBER_ADDRESS);
  });
  describe("submitTradeOrders", async function () {
    it("it should fail when signal is different from the post-trade balance", async function () {
      this.timeout(100000);
      const depositAmount = ethers.utils.parseUnits("1", 18);
      await contracts.WETH.connect(this.depositor).approve(
        this.main.address,
        depositAmount
      );
      await this.main.connect(this.depositor).deposit(depositAmount);
      await this.simpleSignal.submitSignal(
        "testsignal1",
        ["WETH", "USDC"],
        [1, 1],
        "0x"
      );
      this.tradeAmount = "1804000000"; // 1 eth to usdc
      const prewethbal = await contracts.WETH.balanceOf(
        this.main.getSharesAddress()
      );
      const preusdcbal = await contracts.USDC.balanceOf(
        this.main.getSharesAddress()
      );
      const kyberArgs = kyberTakeOrderArgs({
        incomingAsset: contracts.USDC.address,
        minIncomingAssetAmount: this.tradeAmount,
        outgoingAsset: contracts.WETH.address,
        outgoingAssetAmount: ethers.utils.parseEther("1"),
      });
      const kyberVenue = process.env.KYBER_ADDRESS;
      await expect(
        this.main
          .connect(this.settler)
          .submitTradeOrders(Array.of(kyberArgs), Array.of(kyberVenue))
      ).to.be.revertedWith("trade requirement not satisfied");
    });
    it("it should fail when a signal provides an unsupported asset", async function () {
      this.timeout(100000);
      const depositAmount = ethers.utils.parseUnits("1", 18);
      await contracts.WETH.connect(this.depositor).approve(
        this.main.address,
        depositAmount
      );
      await this.main.connect(this.depositor).deposit(depositAmount);
      await this.simpleSignal.submitSignal(
        "testsignal1",
        ["WETH", "WBTC"],
        [1, 1],
        "0x"
      );
      this.tradeAmount = "1804000000"; // 1 eth to usdc
      const prewethbal = await contracts.WETH.balanceOf(
        this.main.getSharesAddress()
      );
      const preusdcbal = await contracts.USDC.balanceOf(
        this.main.getSharesAddress()
      );
      const kyberArgs = kyberTakeOrderArgs({
        incomingAsset: contracts.USDC.address,
        minIncomingAssetAmount: this.tradeAmount,
        outgoingAsset: contracts.WETH.address,
        outgoingAssetAmount: ethers.utils.parseEther("1"),
      });
      const kyberVenue = process.env.KYBER_ADDRESS;
      await expect(
        this.main
          .connect(this.settler)
          .submitTradeOrders(Array.of(kyberArgs), Array.of(kyberVenue))
      ).to.be.reverted;
    });
    it("it should succeed when a signal is validated with the post-trade balance", async function () {
      this.timeout(100000);
      const depositAmount = ethers.utils.parseUnits("2", 18);
      await contracts.WETH.connect(this.depositor).approve(
        this.main.address,
        depositAmount
      );
      await this.main.connect(this.depositor).deposit(depositAmount);
      await this.simpleSignal.submitSignal(
        "testsignal1",
        ["WETH", "USDC"],
        [1, 1],
        "0x"
      );
      this.tradeAmount = "1804000000"; // 1 eth to usdc
      const prewethbal = await contracts.WETH.balanceOf(
        this.main.getSharesAddress()
      );
      const preusdcbal = await contracts.USDC.balanceOf(
        this.main.getSharesAddress()
      );
      const kyberArgs = kyberTakeOrderArgs({
        incomingAsset: contracts.USDC.address,
        minIncomingAssetAmount: this.tradeAmount,
        outgoingAsset: contracts.WETH.address,
        outgoingAssetAmount: ethers.utils.parseEther("1"),
      });
      const kyberVenue = process.env.KYBER_ADDRESS;
      await this.main
        .connect(this.settler)
        .submitTradeOrders(Array.of(kyberArgs), Array.of(kyberVenue));
    });
  });
});
