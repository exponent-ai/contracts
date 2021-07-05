require("dotenv").config();
const { randomAddress } = require("./utils/address.js");
const { waffle } = require("hardhat");
const { deployMockContract } = waffle;
const { expect } = require("chai");

describe("XPNCore", function () {
  beforeEach("deploy contract", async function () {
    [this.deployer, this.admin, this.settler, this.settler2] =
      await ethers.getSigners();
    this.mockAddress = randomAddress();
    const MockToken = await hre.artifacts.readArtifact("IERC20");
    this.shares = await deployMockContract(this.deployer, MockToken.abi);
    this.weth = await deployMockContract(this.deployer, MockToken.abi);

    // deploy integration manager mock
    const Intmanager = await hre.artifacts.readArtifact("IIntegrationManager");
    this.intmanager = await deployMockContract(this.deployer, Intmanager.abi);
    // deploy policy manager mock
    const Policymanager = await hre.artifacts.readArtifact("IPolicyManager");
    this.policymanager = await deployMockContract(
      this.deployer,
      Policymanager.abi
    );
    // deploy comptroller mock
    const Comptroller = await hre.artifacts.readArtifact("IComptroller");
    this.comptroller = await deployMockContract(this.deployer, Comptroller.abi);
    // deploy fund deployer
    const Funddeployer = await hre.artifacts.readArtifact("IFundDeployer");
    this.funddeployer = await deployMockContract(
      this.deployer,
      Funddeployer.abi
    );

    const Signal = await hre.artifacts.readArtifact("ISignal");
    this.signal = await deployMockContract(this.deployer, Signal.abi);
    const Util = await ethers.getContractFactory("XPNUtils");
    this.util = await Util.deploy();
    await this.util.deployed();
    const Core = await ethers.getContractFactory("IntXPNCoreSpy", {
      libraries: {
        XPNUtils: this.util.address,
      },
    });
    this.whitelistPolicy = randomAddress(); // mock addr
    this.trackedAssetAdapterAddress = randomAddress(); // mock addr
    const constructorArgs = [
      this.admin.address,
      this.settler.address,
      this.signal.address,
      "ETH", // ETH denominated
      this.funddeployer.address,
      this.intmanager.address,
      this.trackedAssetAdapterAddress,
      this.policymanager.address,
      this.whitelistPolicy,
      this.mockAddress,
      this.mockAddress,
      [],
      "EX-ETH",
    ];

    await this.funddeployer.mock.createNewFund.returns(
      this.comptroller.address,
      this.shares.address
    );
    this.core = await Core.deploy(
      constructorArgs,
      this.weth.address,
      "EX-ETH",
      "EX-ETH"
    );
    await this.core.deployed();
    await this.core.setSignal(this.signal.address, "signal1");
  });

  describe("initializeFundConfig", async function () {
    it("is reverted when thrown", async function () {
      await this.intmanager.mock.addAuthUserForFund.reverts();
      await this.policymanager.mock.enablePolicyForFund.reverts();
      await this.signal.mock.getSignalMeta.withArgs("signal1").returns(["ETH"]);
      // set mock for signal
      await expect(this.core.initializeFundConfig()).to.be.reverted;
      expect(await this.core.configInitialized()).to.be.false;
    });
    it("is called successfully", async function () {
      await this.intmanager.mock.addAuthUserForFund.returns();
      await this.policymanager.mock.enablePolicyForFund.returns();
      await this.signal.mock.getSignalMeta.withArgs("signal1").returns(["ETH"]);
      await this.core.initializeFundConfig();
      expect(await this.core.configInitialized()).to.be.true;
    });
    it("cannot be called twice", async function () {
      await this.intmanager.mock.addAuthUserForFund.returns();
      await this.policymanager.mock.enablePolicyForFund.returns();
      await this.signal.mock.getSignalMeta.withArgs("signal1").returns(["ETH"]);
      await this.core.initializeFundConfig();
      await expect(this.core.initializeFundConfig()).to.be.revertedWith(
        "XPNCore: config already initialized"
      );
    });
  });
  describe("addTrackedAssets", async function () {
    it("cannot be called before config is initialized", async function () {
      await expect(
        this.core.addTrackedAsset(this.mockAddress)
      ).to.be.revertedWith("XPNCore: config not yet initialized");
    });
    it("emits an event when called successfully", async function () {
      await this.intmanager.mock.addAuthUserForFund.returns();
      await this.policymanager.mock.enablePolicyForFund.returns();
      await this.signal.mock.getSignalMeta.withArgs("signal1").returns(["ETH"]);
      await this.core.initializeFundConfig();
      await this.comptroller.mock.callOnExtension.returns();
      await expect(this.core.addTrackedAsset(this.mockAddress))
        .to.emit(this.core, "TrackedAssetAdded")
        .withArgs(this.mockAddress);
    });
    it("is reverted when thrown", async function () {
      await this.comptroller.mock.callOnExtension.reverts();
      await expect(this.core.addTrackedAsset(this.mockAddress)).to.be.reverted;
    });
  });

  describe("removeTrackedAssets", async function () {
    it("is reverted when thrown", async function () {
      await this.comptroller.mock.callOnExtension.reverts();
      await expect(this.core.removeTrackedAsset(this.mockAddress)).to.be
        .reverted;
    });
    it("emits an event when called successfully", async function () {
      await this.comptroller.mock.callOnExtension.returns();
      await expect(this.core.removeTrackedAsset(this.mockAddress))
        .to.emit(this.core, "TrackedAssetRemoved")
        .withArgs(this.mockAddress);
    });
  });

  describe("depositHook", async function () {
    it("cannot be called before config is initialized", async function () {
      await expect(this.core.depositHook(1000)).to.be.revertedWith(
        "XPNCore: config not yet initialized"
      );
    });
    it("is called successfully", async function () {
      await this.intmanager.mock.addAuthUserForFund.returns();
      await this.policymanager.mock.enablePolicyForFund.returns();
      await this.signal.mock.getSignalMeta.withArgs("signal1").returns(["ETH"]);
      await this.core.initializeFundConfig();
      const amount = 1000;
      await this.weth.mock.approve.returns(true);
      await this.comptroller.mock.buyShares
        .withArgs([this.core.address], [amount], [amount])
        .returns([amount]);
      await this.core.depositHook(amount);
    });
    it("is reverted when thrown", async function () {
      const amount = 1000;
      await this.weth.mock.approve.reverts();
      await expect(this.core.depositHook(amount)).to.be.reverted;
    });
  });

  describe("whitelistVenue", async function () {
    it("emits event when successfully whitelisted", async function () {
      await expect(this.core.whitelistVenue(this.mockAddress))
        .to.emit(this.core, "VenueWhitelisted")
        .withArgs(this.mockAddress);
      expect(await this.core.venueWhitelist(this.mockAddress)).to.be.true;
    });
  });

  describe("deWhitelistVenue", async function () {
    it("emits an event when successfully dewhitelisted", async function () {
      await expect(this.core.deWhitelistVenue(this.mockAddress))
        .to.emit(this.core, "VenueDeWhitelisted")
        .withArgs(this.mockAddress);
      expect(await this.core.venueWhitelist(this.mockAddress)).to.be.false;
    });
  });

  describe("whitelistAsset", async function () {
    it("emits event when successfully whitelisted", async function () {
      await expect(this.core.whitelistAsset(this.mockAddress))
        .to.emit(this.core, "AssetWhitelisted")
        .withArgs(this.mockAddress);
      expect(await this.core.assetWhitelist(this.mockAddress)).to.be.true;
    });
  });

  describe("deWhitelistAsset", async function () {
    it("emits an event when successfully dewhitelisted", async function () {
      await expect(this.core.deWhitelistAsset(this.mockAddress))
        .to.emit(this.core, "AssetDeWhitelisted")
        .withArgs(this.mockAddress);
      expect(await this.core.assetWhitelist(this.mockAddress)).to.be.false;
    });
  });

  describe("stateGetters", async function () {
    it("can fetch the correct internal addresses", async function () {
      expect(await this.core.getPolicyAddress()).to.be.equal(
        this.policymanager.address
      );
      expect(await this.core.getWhitelistPolicyAddress()).to.be.equal(
        this.whitelistPolicy
      );
      expect(await this.core.getTrackedAssetAddress()).to.be.equal(
        this.trackedAssetAdapterAddress
      );
      expect(await this.core.getIntegrationManagerAddress()).to.be.equal(
        this.intmanager.address
      );
      expect(await this.core.getDeployerAddress()).to.be.equal(
        this.funddeployer.address
      );
    });
  });

  describe("submitTrade", async function () {
    it("is reverted when thrown", async function () {
      await this.comptroller.mock.callOnExtension.reverts();
      await expect(this.core.submitTrade("", this.weth.address)).to.be.reverted;
    });
    it("is called successfully", async function () {
      await this.comptroller.mock.callOnExtension.returns();
      await this.core.submitTrade("0x", this.weth.address);
    });
  });

  describe("redeemFeesHook", async function () {
    it("is called successfully", async function () {
      await this.comptroller.mock.callOnExtension.returns();
      await this.core.redeemFeesHook(this.mockAddress, [this.mockAddress]);
    });
    it("is reverted when thrown", async function () {
      await this.comptroller.mock.callOnExtension.reverts();
      await expect(
        this.core.redeemFeesHook(this.mockAddress, [this.mockAddress])
      ).to.be.reverted;
    });
  });

  describe("addAssetConfig", async function () {
    it("adds a new asset config successfully", async function () {
      const btc = randomAddress();
      const btcFeed = randomAddress();
      await expect(this.core.addAssetConfig("BTC", btc, btcFeed))
        .to.emit(this.core, "AssetConfigAdded")
        .withArgs("BTC", btc, btcFeed);
      expect(await this.core.getAssetConfig("BTC")).to.deep.equal([
        btc,
        btcFeed,
      ]);
    });
  });

  describe("removeAssetConfig", async function () {
    it("removes an asset config successfully", async function () {
      const btc = randomAddress();
      const btcFeed = randomAddress();
      await this.core.addAssetConfig("BTC", btc, btcFeed);
      await expect(this.core.removeAssetConfig("BTC"))
        .to.emit(this.core, "AssetConfigRemoved")
        .withArgs("BTC");
      expect(await this.core.getAssetConfig("BTC")).to.deep.equal([
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
      ]);
    });
  });

  describe("verifySignal", async function () {
    it("is called successfully for denom asset", async function () {
      await this.signal.mock.getSignalMeta.withArgs("signal1").returns(["ETH"]);
      await this.core.verifySignal(this.signal.address, "signal1");
    });
    it("is reverted when a symbol is not registered", async function () {
      await this.signal.mock.getSignalMeta
        .withArgs("signal1")
        .returns(["SHIB"]);
      await expect(
        this.core.verifySignal(this.signal.address, "signal1")
      ).to.be.revertedWith("XPNCore: token symbol is not registered");
    });
    it("is reverted when non denom asset is not whitelisted", async function () {
      await this.signal.mock.getSignalMeta.withArgs("signal1").returns(["BTC"]);
      const btc = randomAddress();
      const btcFeed = randomAddress();
      await this.core.addAssetConfig("BTC", btc, btcFeed);
      await expect(
        this.core.verifySignal(this.signal.address, "signal1")
      ).to.be.revertedWith("XPNCore: token is not whitelisted");
    });
    it("is called sucessfully for non denom asset", async function () {
      await this.signal.mock.getSignalMeta.withArgs("signal1").returns(["BTC"]);
      const btc = randomAddress();
      const btcFeed = randomAddress();
      await this.core.whitelistAsset(btc);
      await this.core.addAssetConfig("BTC", btc, btcFeed);
      await this.core.verifySignal(this.signal.address, "signal1");
    });
  });
});
