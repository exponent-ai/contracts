require("dotenv").config();
const { expect } = require("chai");
const {
  seedBalance,
  initMainnetEnv,
  cleanUp,
  setSnapshot,
} = require("../utils/integration-test-setup.js");
const {
  managementFeeConfigArgs,
  feeManagerConfigArgs,
  performanceFeeConfigArgs,
  validateRulePreBuySharesArgs,
  convertRateToScaledPerSecondRate,
} = require("@enzymefinance/protocol");

describe("XPNCore", function () {
  let contracts;
  before("deploy contract", async function () {
    await setSnapshot();
    [this.deployer, this.settler, this.settler2, this.admin] =
      await ethers.getSigners();
    contracts = await initMainnetEnv();
    const Util = await ethers.getContractFactory("XPNUtils");
    this.util = await Util.deploy();
    await this.util.deployed();
    const Core = await ethers.getContractFactory("IntXPNCoreSpy", {
      libraries: {
        XPNUtils: this.util.address,
      },
    });
    const Signal = await ethers.getContractFactory("XPNSignal");
    this.simpleSignal = await Signal.deploy();
    await this.simpleSignal.deployed();
    await this.simpleSignal.registerSignal("testsignal1", "Simple", ["ETH"]);

    await this.simpleSignal.submitSignal("testsignal1", ["ETH"], [1], "0x");

    const constructorArgs = [
      this.admin.address,
      this.settler.address,
      this.simpleSignal.address, // signal address
      "ETH",
      contracts.ENZYME_DEPLOYER.address,
      contracts.ENZYME_INT_MANAGER.address,
      contracts.ENZYME_ASSET_ADAPTER.address,
      contracts.ENZYME_POLICY_MANAGER.address, // policy manager
      contracts.ENZYME_INVESTOR_WHITELIST.address, // investor whitelist
      ethers.constants.AddressZero,
      ethers.constants.AddressZero,
      [],
      "EX-ETH",
    ];

    this.core = await Core.deploy(
      constructorArgs,
      contracts.WETH.address,
      "EX-ETH",
      "EX-ETH"
    );
    await this.core.deployed();
    await this.core.setSignal(this.simpleSignal.address, "testsignal1");
  });
  it("should deploy shares and LP tokens correctly", async function () {
    expect(await this.core.getComptrollerAddress()).to.not.equal(
      ethers.constants.AddressZero
    );
    expect(await this.core.getSharesAddress()).to.not.equal(
      ethers.constants.AddressZero
    );
  });
  it("should correctly initialize fund config", async function () {
    await this.core.initializeFundConfig();
    const comptroller = await this.core.getComptrollerAddress();
    // only core contract could deposit
    expect(await this.core.passesRule(comptroller, this.core.address)).to.be
      .true;
    //only core contract could submit a trade
    expect(await this.core.isAuthUserForFund(this.core.address)).to.be.true;
  });
  it("should add tracked asset", async function () {
    const sharesAddress = await this.core.getSharesAddress();
    const shares = await ethers.getContractAt("IShares", sharesAddress);
    await this.core.addTrackedAsset(contracts.USDC.address);
    expect(await shares.isTrackedAsset(contracts.WETH.address)).to.be.true;
    expect(await shares.isTrackedAsset(contracts.USDC.address)).to.be.true;
  });
  it("should remove tracked asset", async function () {
    const sharesAddress = await this.core.getSharesAddress();
    const shares = await ethers.getContractAt("IShares", sharesAddress);
    await this.core.removeTrackedAsset(contracts.USDC.address);
    expect(await shares.isTrackedAsset(contracts.WETH.address)).to.be.true;
    expect(await shares.isTrackedAsset(contracts.USDC.address)).to.be.false;
  });
});
