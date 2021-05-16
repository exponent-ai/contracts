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
  convertRateToScaledPerSecondRate,
} = require("@enzymefinance/protocol");

describe("XPNVault", function () {
  describe("user actions", function () {
    let contracts;
    before("create vault", async function () {
      await setSnapshot();
      [this.depositor1, this.depositor2, this.admin] =
        await ethers.getSigners();
      contracts = await initMainnetEnv();
      this.depositAmount = ethers.utils.parseUnits("50", 18);
      await seedBalance({
        ticker: "WETH",
        contract: contracts.WETH,
        to: this.depositor1.address,
        amount: this.depositAmount,
      });
      expect(
        await contracts.WETH.balanceOf(this.depositor1.address)
      ).to.be.equal(this.depositAmount);
      const Vault = await ethers.getContractFactory("SpyIntXPNVault");

      this.timeout(100000); // wait for contract deployment
      this.vaultConsumer = await Vault.deploy(
        this.admin.address,
        contracts.ENZYME_DEPLOYER.address,
        contracts.WETH.address,
        contracts.ENZYME_INT_MANAGER.address,
        contracts.ENZYME_ASSET_ADAPTER.address,
        "XPN-LP",
        "XPN-LP",
        feeManagerConfigArgs({ fees: [], settings: [] })
      );
      await this.vaultConsumer.deployed();

      const comptrollerAddress = await this.vaultConsumer.controller();
      const sharesAddress = await this.vaultConsumer.shares();
      const lpAddress = await this.vaultConsumer.lptoken();
      expect(comptrollerAddress).to.be.properAddress;
      expect(sharesAddress).to.be.properAddress;
      expect(lpAddress).to.be.properAddress;

      contracts.shares = await ethers.getContractAt("IShares", sharesAddress);
      contracts.lptoken = await ethers.getContractAt("ERC20", lpAddress);

      // add nameTags to wallets on debug mode
      hre.tracer.nameTags[this.vaultConsumer.address] = "Vault";
      hre.tracer.nameTags[this.depositor1.address] = "depositor1";
      hre.tracer.nameTags[this.depositor2.address] = "depositor2";
      hre.tracer.nameTags[this.admin.address] = "admin";
      hre.tracer.nameTags[contracts.WETH.address] = "WETH";
      hre.tracer.nameTags[contracts.ENZYME_DEPLOYER.address] =
        "contracts.ENZYME_DEPLOYER";
      hre.tracer.nameTags[comptrollerAddress] = "ENZYME_COMPTROLLER";
      hre.tracer.nameTags[sharesAddress] = "ENZYME_SHARES";
      hre.tracer.nameTags[lpAddress] = "XPN LP Token";
    });

    after("clean up", async function () {
      const { WETH } = await initMainnetEnv();
      const [deployer] = await ethers.getSigners();
      await cleanUp({ tokens: [WETH], users: [deployer] });
    });

    describe("deposit", function () {
      it("should have the same supply and balance for first depositor", async function () {
        await contracts.WETH.approve(
          this.vaultConsumer.address,
          this.depositAmount
        );
        await this.vaultConsumer.deposit(this.depositAmount);
        expect(
          await contracts.WETH.balanceOf(contracts.shares.address)
        ).to.be.equal(this.depositAmount);
        expect(
          await contracts.shares.balanceOf(this.vaultConsumer.address)
        ).to.be.equal(this.depositAmount);
        expect(await contracts.shares.totalSupply()).to.be.equal(
          this.depositAmount
        );
        expect(
          await contracts.lptoken.balanceOf(this.depositor1.address)
        ).to.be.equal(this.depositAmount);
        expect(await contracts.lptoken.totalSupply()).to.be.equal(
          this.depositAmount
        );
      });
      it("should have the correct supply and balance for second depositor", async function () {
        const expectedSupply = ethers.utils.parseUnits("100", 18);
        await seedBalance({
          ticker: "WETH",
          contract: contracts.WETH,
          to: this.depositor2.address,
          amount: this.depositAmount,
        });
        await contracts.WETH.connect(this.depositor2).approve(
          this.vaultConsumer.address,
          this.depositAmount
        );
        await this.vaultConsumer
          .connect(this.depositor2)
          .deposit(this.depositAmount);

        expect(
          await contracts.WETH.balanceOf(contracts.shares.address)
        ).to.be.equal(expectedSupply);
        expect(
          await contracts.shares.balanceOf(this.vaultConsumer.address)
        ).to.be.equal(expectedSupply);
        expect(await contracts.shares.totalSupply()).to.be.equal(
          expectedSupply
        );
        expect(
          await contracts.lptoken.balanceOf(this.depositor1.address)
        ).to.be.equal(this.depositAmount);
        expect(
          await contracts.lptoken.balanceOf(this.depositor2.address)
        ).to.be.equal(this.depositAmount);
        expect(await contracts.lptoken.totalSupply()).to.be.equal(
          expectedSupply
        );
      });
    });

    describe("withdraw", function () {
      it("should withdraw correct amount for single asset portfolio", async function () {
        const expectedPayout = ethers.utils.parseUnits("50", 18);
        await contracts.lptoken.approve(
          this.vaultConsumer.address,
          expectedPayout
        );
        await this.vaultConsumer.withdraw(expectedPayout);

        expect(
          await contracts.lptoken.balanceOf(this.depositor1.address)
        ).to.be.equal(0);
        expect(
          await contracts.WETH.balanceOf(this.depositor1.address)
        ).to.be.equal(expectedPayout);
        expect(
          await contracts.WETH.balanceOf(contracts.shares.address)
        ).to.be.equal(expectedPayout);
      });

      it("should withdraw correct assets and amounts for multi assets portfolio", async function () {
        const usdcAmount = 100000;
        // currently the enzyme vault does not track USDC, we will force send USDC to the address and start tracking it
        await this.vaultConsumer.addTrackedAsset(contracts.USDC.address);
        expect(await contracts.shares.isTrackedAsset(contracts.WETH.address)).to
          .be.true;
        expect(await contracts.shares.isTrackedAsset(contracts.USDC.address)).to
          .be.true;
        await seedBalance({
          ticker: "USDC",
          contract: contracts.USDC,
          to: contracts.shares.address,
          amount: usdcAmount,
        });

        expect(
          await contracts.USDC.balanceOf(contracts.shares.address)
        ).to.be.equal(usdcAmount);
        await contracts.lptoken
          .connect(this.depositor2)
          .approve(this.vaultConsumer.address, this.depositAmount);
        await this.vaultConsumer
          .connect(this.depositor2)
          .withdraw(this.depositAmount);
        expect(
          await contracts.lptoken.balanceOf(this.depositor2.address)
        ).to.be.equal(0);
        expect(
          await contracts.WETH.balanceOf(this.depositor2.address)
        ).to.be.equal(this.depositAmount);
        expect(
          await contracts.USDC.balanceOf(this.depositor2.address)
        ).to.be.equal(usdcAmount);
        expect(
          await contracts.WETH.balanceOf(contracts.shares.address)
        ).to.be.equal(0);
        expect(
          await contracts.USDC.balanceOf(contracts.shares.address)
        ).to.be.equal(0);
      });
    });
  });

  describe("admin actions", function () {
    describe("fee", function () {
      let contracts;

      before("create vault", async function () {
        await setSnapshot();
        [this.depositor1, this.depositor2, this.admin] =
          await ethers.getSigners();
        contracts = await initMainnetEnv();
        this.depositAmount = ethers.utils.parseUnits("50", 18);
        await seedBalance({
          ticker: "WETH",
          contract: contracts.WETH,
          to: this.depositor1.address,
          amount: this.depositAmount,
        });
        expect(
          await contracts.WETH.balanceOf(this.depositor1.address)
        ).to.be.equal(this.depositAmount);
        const Vault = await ethers.getContractFactory("SpyIntXPNVault");

        this.timeout(100000); // wait for contract deployment
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
            "0x889f2FCB6c12d836cB8f7567A1bdfa512FE9f647",
            "0x70478df01108Cb2fCB23463814e648363CE17720",
          ],
          settings: [managementFeeSettings, performanceFeeConfig],
        });
        this.vaultConsumer = await Vault.deploy(
          this.admin.address,
          contracts.ENZYME_DEPLOYER.address,
          contracts.WETH.address,
          contracts.ENZYME_INT_MANAGER.address,
          contracts.ENZYME_ASSET_ADAPTER.address,
          "XPN-LP",
          "XPN-LP",
          feeManagerConfigData
        );
        await this.vaultConsumer.deployed();

        const sharesAddress = await this.vaultConsumer.shares();
        const lpAddress = await this.vaultConsumer.lptoken();

        contracts.shares = await ethers.getContractAt("IShares", sharesAddress);
        contracts.lptoken = await ethers.getContractAt("ERC20", lpAddress);
      });

      after("clean up", async function () {
        const { WETH } = await initMainnetEnv();
        const [deployer] = await ethers.getSigners();
        await cleanUp({ tokens: [WETH], users: [deployer] });
      });

      it("should correctly redeemFees to admin address", async function () {
        await contracts.WETH.approve(this.vaultConsumer.address, 10000);
        await this.vaultConsumer.deposit(10000);
        await contracts.WETH.transfer(contracts.shares.address, 1000); // simulate an increase in GAV to trigger performance fee calculations
        this.timeout(100000);
        // simulate a 1 year passage of time
        await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 * 365]);
        await ethers.provider.send("evm_mine");

        // redeem both management and performance fees
        await this.vaultConsumer.redeemFees(
          "0xEcDbcdB8Dbf0AC54f47E41D3DD0C7DaE07828aAa",
          [
            "0x889f2FCB6c12d836cB8f7567A1bdfa512FE9f647",
            "0x70478df01108Cb2fCB23463814e648363CE17720",
          ]
        );
        const sharesbal = await contracts.shares.balanceOf(
          this.vaultConsumer.address
        );
        const lpbalance = await contracts.lptoken.totalSupply();
        expect(lpbalance).to.be.equal(sharesbal); // all additional fee shares are spent
        expect(await contracts.WETH.balanceOf(this.admin.address)).to.be.equal(
          247
        );
      });
    });
  });
});
