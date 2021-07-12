require("dotenv").config();
const { expect } = require("chai");
const {
  seedBalance,
  initMainnetEnv,
  cleanUp,
  setSnapshot,
  getDeployedContractBytes,
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
  beforeEach("deploy contract", async function () {
    await setSnapshot();
    [this.deployer, this.settler, this.settler2, this.admin, this.depositor] =
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
  describe("Core application logic", async function () {
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
      await this.core.initializeFundConfig();
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
  describe("Vault migration", async function () {
    it("should perform vault migration successfully", async function () {
      // deploy a new FundDeployer contract
      const deployerTxHash =
        "0xefac33ba5f88ff10bfaa0e85cd8676f409ce9f505a4afe84c2a5cd8c6269511d";
      const comptrollerLibTxHash =
        "0xc3273d286633e56fb5f7534f16713fae347f84dc65a43bf9906f0fd2c5306b10";
      const deployerTransaction =
        "0xefac33ba5f88ff10bfaa0e85cd8676f409ce9f505a4afe84c2a5cd8c6269511d";

      const newDeployer = await getDeployedContractBytes(
        deployerTxHash,
        "IFundDeployer",
        this.deployer
      );
      await newDeployer.deployed();

      // // NOTE here we have to modify ComptrollerLib contract data
      // // comptroller lib has a hardcoded address on deployment, here we simply replace old
      // // fund deployer address with our new fund deployer
      const newComptrollerLib = await getDeployedContractBytes(
        comptrollerLibTxHash,
        "IComptroller",
        this.deployer,
        function (bytes) {
          return bytes.replace(
            contracts.ENZYME_DEPLOYER.address.toLowerCase().replace("0x", ""),
            newDeployer.address.replace("0x", "")
          );
        }
      );
      await newComptrollerLib.deployed();

      // only difference between this and the old constructor arg is our new fund deployer contract address

      const newConstructorArgs = [
        this.admin.address,
        this.settler.address,
        this.simpleSignal.address,
        "ETH",
        newDeployer.address, // our new fund deployer contract
        contracts.ENZYME_INT_MANAGER.address,
        contracts.ENZYME_ASSET_ADAPTER.address,
        contracts.ENZYME_POLICY_MANAGER.address,
        contracts.ENZYME_INVESTOR_WHITELIST.address,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        [],
        "EX-ETH",
      ];

      const enzymeDispatcherOwner =
        "0xb270fe91e8e4b80452fbf1b4704208792a350f53";

      // NOTE now we begin the process to set up the new release
      // impersonate dispatcher's owner to setCurrentFundDeployer to our new contract
      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [enzymeDispatcherOwner],
      });

      const dispatcherOwner = await ethers.provider.getSigner(
        enzymeDispatcherOwner
      );

      await this.deployer.sendTransaction({
        to: enzymeDispatcherOwner,
        from: this.deployer.address,
        value: ethers.utils.parseEther("1.0"),
        data: "0x",
      });

      const dispatcherInterface = new ethers.utils.Interface([
        "function setCurrentFundDeployer(address) external",
        "function getMigrationTimelock() external view returns (uint256)",
      ]);

      const dispatcher = new ethers.Contract(
        contracts.ENZYME_DISPATCHER.address,
        dispatcherInterface,
        dispatcherOwner
      );

      // set the new comptrollerLib address on the new fund deployer
      await newDeployer
        .connect(this.deployer)
        .setComptrollerLib(newComptrollerLib.address);

      // set the release status on fund deployer as 'LIVE'
      await newDeployer.connect(dispatcherOwner).setReleaseStatus(1);

      // set the current the newest release on dispatcher as our new fund deployer
      await dispatcher.setCurrentFundDeployer(newDeployer.address);

      await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [enzymeDispatcherOwner],
      });

      const approveAmount = 20000;
      const depositAmount = 10000;

      await seedBalance({
        ticker: "WETH",
        contract: contracts.WETH,
        to: this.depositor.address,
        amount: depositAmount,
      });

      await this.core.initializeFundConfig();

      await contracts.WETH.connect(this.depositor).approve(
        this.core.address,
        approveAmount
      );

      await this.core.connect(this.depositor).deposit(depositAmount); //deposit should work
      const oldVaultAddress = await this.core.getVaultAddress();
      await expect(this.core.createMigration(newConstructorArgs)).to.emit(
        this.core,
        "MigrationCreated"
      );
      await expect(this.core.signalMigration()).to.emit(
        this.core,
        "MigrationSignaled"
      );

      await expect(this.core.connect(this.depositor).deposit(depositAmount)).to
        .be.reverted; //deposit after signalMigration should fail

      await this.core.connect(this.depositor).withdraw(depositAmount); //withdrawal should still work
      expect(
        await contracts.WETH.balanceOf(this.depositor.address)
      ).to.be.equal(depositAmount);

      const migrationTime = await dispatcher.getMigrationTimelock();
      // // simulate passage of time required for the migration to pass
      await ethers.provider.send("evm_increaseTime", [
        migrationTime.toNumber(),
      ]);
      await ethers.provider.send("evm_mine");
      await expect(this.core.executeMigration()).to.emit(
        this.core,
        "MigrationExecuted"
      );

      await this.core.connect(this.depositor).deposit(depositAmount); //deposit should work

      await this.core.connect(this.depositor).withdraw(depositAmount); //withdrawal should still work
      expect(
        await contracts.WETH.balanceOf(this.depositor.address)
      ).to.be.equal(depositAmount);
    });
  });
});
