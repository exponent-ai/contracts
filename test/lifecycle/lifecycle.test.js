require("dotenv").config();
const { expect } = require("chai");

const { randomAddress } = require("../utils/address.js");
const {
  seedBalance,
  initMainnetEnv,
  cleanUp,
  setSnapshot,
} = require("../utils/integration-test-setup.js");
const { kyberTakeOrderArgs } = require("@enzymefinance/protocol");
const {
  managementFeeConfigArgs,
  feeManagerConfigArgs,
  performanceFeeConfigArgs,
  convertRateToScaledPerSecondRate,
} = require("@enzymefinance/protocol");

describe("XPN life cycle", function () {
  let contracts;
  describe("XPN happy path", function () {
    /* set up
          - set up env
          - seed balance
        deploy signal
          - deploy signal contract
        deploy fund
          - deploy XPN main
        create signal testsignal
          - register signal named 'testsignal'
        submit signal 50% WETH - 50% USDC - 0% WBTC
          - submit a simple signal 50% WETH - 50% USDC - 0% WBTC
        set asset whitelist
          - add WETH, USDC, and WBTC to whitelist
        set fund signal to testsignal
          - set signal of the fund to testsignal
        whitelistVenue
          - whitelist kyber
        deposit WETH
          - deposit WETH
        settle - trade 50% of WETH to USDC
          - trade some WETH to USDC
        withdraw fee
          - push evm time
          - withdraw fee (performance,management)
        withdraw from the vault
          - withdraw some share
    */
    before("set up test", async function () {
      await setSnapshot();

      [
        this.deployer,
        this.admin,
        this.settler,
        this.venueWhitelister,
        this.assetWhitelister,
        this.manager,
        this.user1,
        this.user2,
        this.depositor,
        this.signalProvider,
      ] = await ethers.getSigners();

      [contracts] = await initMainnetEnv();

      this.depositAmount = ethers.utils.parseUnits("50", 18);

      await seedBalance({
        ticker: "WETH",
        contract: this.contracts.WETH,
        to: this.depositor.address,
        amount: this.depositAmount,
      });
    });

    it("deploy signal", async function () {
      const Signal = await ethers.getContractFactory("XPNSignal");
      this.simpleSignal = await Signal.connect(this.signalProvider).deploy();
      await this.simpleSignal.deployed();
    });

    it("deploy fund", async function () {
      const Util = await ethers.getContractFactory("XPNUtils");
      this.util = await Util.deploy();
      await this.util.deployed();
      const Main = await ethers.getContractFactory("XPNMain", {
        libraries: {
          XPNUtils: this.util.address,
        },
      });

      const rate = ethers.utils.parseEther("0.015"); // .15%
      const scaledPerSecondRate = convertRateToScaledPerSecondRate(rate);

      const managementFeeSettings =
        managementFeeConfigArgs(scaledPerSecondRate);
      const performanceFeeRate = ethers.utils.parseEther(".1"); // 10% performance fees
      const performanceFeePeriod = ethers.BigNumber.from(24 * 60 * 60 * 365); // 365 days
      const performanceFeeConfig = performanceFeeConfigArgs({
        rate: performanceFeeRate,
        period: performanceFeePeriod,
      });
      const feeManagerConfigData = feeManagerConfigArgs({
        fees: [
          contracts.ENZYME_MANAGEMENT_FEE.address,
          contracts.ENZYME_PERFORMANCE_FEE.address,
        ],
        settings: [managementFeeSettings, performanceFeeConfig],
      });

      const constructorArgs = [
        this.admin.address,
        this.settler.address,
        this.simpleSignal.address, // signal address
        this.contracts.WETH.address,
        "WETH",
        this.contracts.ENZYME_DEPLOYER.address,
        this.contracts.ENZYME_INT_MANAGER.address,
        this.contracts.ENZYME_ASSET_ADAPTER.address,
        this.contracts.ENZYME_POLICY_MANAGER.address, // policy manager // Missing for CONF
        this.contracts.ENZYME_INVESTOR_WHITELIST.address, // investor whitelist  // Missing for CONF
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        feeManagerConfigData,
        "EX-ETH",
      ];

      this.main = await Main.deploy(constructorArgs, "EX-ETH", "EX-ETH");
      await this.main.deployed();
    });

    it("create signal", async function () {
      await this.simpleSignal
        .connect(this.signalProvider)
        .registerSignal("testsignal", "Simple", ["WETH", "BTC", "USDC"]);
    });

    it("submit signal", async function () {
      await this.simpleSignal
        .connect(this.signalProvider)
        .submitSignal("testsignal", ["WETH", "BTC", "USDC"], [1, 0, 1], "0x");
    });

    it("set asset whitelist", async function () {
      this.assetWhitelisterRole = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("ASSET_WHITELIST_ROLE")
      );
      await this.main
        .connect(this.admin)
        .grantRole(this.assetWhitelisterRole, this.assetWhitelister.address);
      const btcAddress = contracts.WBTC.address;
      const btcETHFeed = contracts.ORACLE_WBTC_ETH.address;
      await this.main
        .connect(this.assetWhitelister)
        .addAssetFeedConfig("BTC", btcAddress, btcETHFeed);

      await this.main.connect(this.assetWhitelister).whitelistAsset(btcAddress);
      const usdcAddress = contracts.USDC.address;
      const usdcETHFeed = contracts.ORACLE_USDC_ETH.address;
      await this.main
        .connect(this.assetWhitelister)
        .addAssetFeedConfig("USDC", usdcAddress, usdcETHFeed);
      await this.main
        .connect(this.assetWhitelister)
        .whitelistAsset(usdcAddress);

      const wethAddress = contracts.WETH.address;
      const wethFeed = contracts.WETH.address;
      await this.main
        .connect(this.assetWhitelister)
        .addAssetFeedConfig("WETH", wethAddress, randomAddress());
      await this.main
        .connect(this.assetWhitelister)
        .whitelistAsset(wethAddress);
    });

    it("set signal", async function () {
      await this.main
        .connect(this.admin)
        .swapSignal(this.simpleSignal.address, "testsignal");
    });

    it("init fund", async function () {
      await this.main.connect(this.admin).initializeFundConfig();
    });

    it("whitelistVenue", async function () {
      this.venueWhitelisterRole = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("VENUE_WHITELIST_ROLE")
      );
      await this.main
        .connect(this.admin)
        .grantRole(this.venueWhitelisterRole, this.venueWhitelister.address);
      await this.main
        .connect(this.venueWhitelister)
        .whitelistVenue(process.env.KYBER_ADDRESS);
    });

    it("deposit", async function () {
      await this.contracts.WETH.connect(this.depositor).approve(
        this.main.address,
        this.depositAmount
      );
      await this.main.connect(this.depositor).deposit(this.depositAmount);
    });

    it("trade settlement", async function () {
      this.timeout(100000);
      this.tradeAmount = "1804000000";
      const prewethbal = await this.contracts.WETH.balanceOf(
        this.main.getSharesAddress()
      );
      const preusdcbal = await this.contracts.USDC.balanceOf(
        this.main.getSharesAddress()
      );
      const kyberArgs = kyberTakeOrderArgs({
        incomingAsset: this.contracts.USDC.address,
        minIncomingAssetAmount: this.tradeAmount,
        outgoingAsset: this.contracts.WETH.address,
        outgoingAssetAmount: ethers.utils.parseEther("1"),
      });
      const kyberVenue = process.env.KYBER_ADDRESS;
      await this.main
        .connect(this.settler)
        .submitTradeOrders(Array.of(kyberArgs), Array.of(kyberVenue));
      const postwethbal = await this.contracts.WETH.balanceOf(
        this.main.getSharesAddress()
      );
      const postusdcbal = await this.contracts.USDC.balanceOf(
        this.main.getSharesAddress()
      );
      expect(prewethbal).to.be.above(postwethbal);
      expect(preusdcbal).to.be.below(postusdcbal);
    });

    it("withdraw fee", async function () {
      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 * 365]);
      await ethers.provider.send("evm_mine");
      await this.main
        .connect(this.admin)
        .redeemFees(contracts.ENZYME_FEE_MANAGER.address, [
          contracts.ENZYME_MANAGEMENT_FEE.address,
          contracts.ENZYME_PERFORMANCE_FEE.address,
        ]);
    });

    it("withdraw principle", async function () {
      var preWETH = await this.contracts.WETH.balanceOf(this.depositor.address);
      var preUSDC = await this.contracts.USDC.balanceOf(this.depositor.address);

      await this.main
        .connect(this.depositor)
        .withdraw(ethers.utils.parseUnits("50", 18));

      expect(
        await this.contracts.WETH.balanceOf(this.depositor.address)
      ).to.be.above(preWETH);
      expect(
        await this.contracts.USDC.balanceOf(this.depositor.address)
      ).to.be.above(preUSDC);
    });
  });
});
