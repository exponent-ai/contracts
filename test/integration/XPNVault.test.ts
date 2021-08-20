// Copyright (C) 2021 Exponent

// This file is part of Exponent.

// Exponent is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Exponent is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Exponent.  If not, see <http://www.gnu.org/licenses/>.

import { ethers } from "hardhat";
import { expect } from "chai";
import {
  seedBalance,
  initMainnetEnv,
  cleanUp,
  setSnapshot,
} from "../utils/integration-test-setup";
import {
  managementFeeConfigArgs,
  feeManagerConfigArgs,
  performanceFeeConfigArgs,
  convertRateToScaledPerSecondRate,
} from "@enzymefinance/protocol";

describe("XPNVault", function () {
  describe("user actions", function () {
    before("create vault", async function () {
      await setSnapshot();
      [this.depositor1, this.depositor2, this.admin] =
        await ethers.getSigners();
      [this.contracts] = await initMainnetEnv();
      this.depositAmount = ethers.utils.parseUnits("50", 18);
      await seedBalance({
        ticker: "WETH",
        contract: this.contracts.WETH,
        to: this.depositor1.address,
        amount: this.depositAmount,
      });
      expect(
        await this.contracts.WETH.balanceOf(this.depositor1.address)
      ).to.be.equal(this.depositAmount);
      const Vault = await ethers.getContractFactory("SpyIntXPNVault");

      this.timeout(100000); // wait for contract deployment
      this.vaultConsumer = await Vault.deploy(
        this.admin.address,
        this.contracts.ENZYME_DEPLOYER.address,
        this.contracts.WETH.address,
        this.contracts.ENZYME_INT_MANAGER.address,
        this.contracts.ENZYME_ASSET_ADAPTER.address,
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

      this.contracts.shares = await ethers.getContractAt(
        "IShares",
        sharesAddress
      );
      this.contracts.lptoken = await ethers.getContractAt("ERC20", lpAddress);
    });

    after("clean up", async function () {
      const [{ WETH }] = await initMainnetEnv();
      const [deployer] = await ethers.getSigners();
      await cleanUp({ tokens: [WETH], users: [deployer] });
    });

    describe("deposit", function () {
      it("should have the same supply and balance for first depositor", async function () {
        await this.contracts.WETH.approve(
          this.vaultConsumer.address,
          this.depositAmount
        );
        await this.vaultConsumer.deposit(this.depositAmount);
        expect(
          await this.contracts.WETH.balanceOf(this.contracts.shares.address)
        ).to.be.equal(this.depositAmount);
        expect(
          await this.contracts.shares.balanceOf(this.vaultConsumer.address)
        ).to.be.equal(this.depositAmount);
        expect(await this.contracts.shares.totalSupply()).to.be.equal(
          this.depositAmount
        );
        expect(
          await this.contracts.lptoken.balanceOf(this.depositor1.address)
        ).to.be.equal(this.depositAmount);
        expect(await this.contracts.lptoken.totalSupply()).to.be.equal(
          this.depositAmount
        );
      });
      it("should have the correct supply and balance for second depositor", async function () {
        const expectedSupply = ethers.utils.parseUnits("100", 18);
        await seedBalance({
          ticker: "WETH",
          contract: this.contracts.WETH,
          to: this.depositor2.address,
          amount: this.depositAmount,
        });
        await this.contracts.WETH.connect(this.depositor2).approve(
          this.vaultConsumer.address,
          this.depositAmount
        );
        await this.vaultConsumer
          .connect(this.depositor2)
          .deposit(this.depositAmount);

        expect(
          await this.contracts.WETH.balanceOf(this.contracts.shares.address)
        ).to.be.equal(expectedSupply);
        expect(
          await this.contracts.shares.balanceOf(this.vaultConsumer.address)
        ).to.be.equal(expectedSupply);
        expect(await this.contracts.shares.totalSupply()).to.be.equal(
          expectedSupply
        );
        expect(
          await this.contracts.lptoken.balanceOf(this.depositor1.address)
        ).to.be.equal(this.depositAmount);
        expect(
          await this.contracts.lptoken.balanceOf(this.depositor2.address)
        ).to.be.equal(this.depositAmount);
        expect(await this.contracts.lptoken.totalSupply()).to.be.equal(
          expectedSupply
        );
      });
    });

    describe("withdraw", function () {
      it("should withdraw correct amount for single asset portfolio", async function () {
        const expectedPayout = ethers.utils.parseUnits("50", 18);
        await this.contracts.lptoken.approve(
          this.vaultConsumer.address,
          expectedPayout
        );
        await this.vaultConsumer.withdraw(expectedPayout);

        expect(
          await this.contracts.lptoken.balanceOf(this.depositor1.address)
        ).to.be.equal(0);
        expect(
          await this.contracts.WETH.balanceOf(this.depositor1.address)
        ).to.be.equal(expectedPayout);
        expect(
          await this.contracts.WETH.balanceOf(this.contracts.shares.address)
        ).to.be.equal(expectedPayout);
      });

      it("should withdraw correct assets and amounts for multi assets portfolio", async function () {
        const usdcAmount = 100000;
        // currently the enzyme vault does not track USDC, we will force send USDC to the address and start tracking it
        await this.vaultConsumer.addTrackedAsset(this.contracts.USDC.address);
        expect(
          await this.contracts.shares.isTrackedAsset(
            this.contracts.WETH.address
          )
        ).to.be.true;
        expect(
          await this.contracts.shares.isTrackedAsset(
            this.contracts.USDC.address
          )
        ).to.be.true;
        await seedBalance({
          ticker: "USDC",
          contract: this.contracts.USDC,
          to: this.contracts.shares.address,
          amount: usdcAmount,
        });

        expect(
          await this.contracts.USDC.balanceOf(this.contracts.shares.address)
        ).to.be.equal(usdcAmount);
        await this.contracts.lptoken
          .connect(this.depositor2)
          .approve(this.vaultConsumer.address, this.depositAmount);
        await this.vaultConsumer
          .connect(this.depositor2)
          .withdraw(this.depositAmount);
        expect(
          await this.contracts.lptoken.balanceOf(this.depositor2.address)
        ).to.be.equal(0);
        expect(
          await this.contracts.WETH.balanceOf(this.depositor2.address)
        ).to.be.equal(this.depositAmount);
        expect(
          await this.contracts.USDC.balanceOf(this.depositor2.address)
        ).to.be.equal(usdcAmount);
        expect(
          await this.contracts.WETH.balanceOf(this.contracts.shares.address)
        ).to.be.equal(0);
        expect(
          await this.contracts.USDC.balanceOf(this.contracts.shares.address)
        ).to.be.equal(0);
      });
    });
  });

  describe("admin actions", function () {
    describe("fee", function () {
      before("create vault", async function () {
        await setSnapshot();
        [this.depositor1, this.depositor2, this.admin] =
          await ethers.getSigners();
        [this.contracts] = await initMainnetEnv();
        this.depositAmount = ethers.utils.parseUnits("50", 18);
        await seedBalance({
          ticker: "WETH",
          contract: this.contracts.WETH,
          to: this.depositor1.address,
          amount: this.depositAmount,
        });
        expect(
          await this.contracts.WETH.balanceOf(this.depositor1.address)
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
            this.contracts.ENZYME_MANAGEMENT_FEE.address,
            this.contracts.ENZYME_PERFORMANCE_FEE.address,
          ],
          settings: [managementFeeSettings, performanceFeeConfig],
        });
        this.vaultConsumer = await Vault.deploy(
          this.admin.address,
          this.contracts.ENZYME_DEPLOYER.address,
          this.contracts.WETH.address,
          this.contracts.ENZYME_INT_MANAGER.address,
          this.contracts.ENZYME_ASSET_ADAPTER.address,
          "XPN-LP",
          "XPN-LP",
          feeManagerConfigData
        );
        await this.vaultConsumer.deployed();

        const sharesAddress = await this.vaultConsumer.shares();
        const lpAddress = await this.vaultConsumer.lptoken();

        this.contracts.shares = await ethers.getContractAt(
          "IShares",
          sharesAddress
        );
        this.contracts.lptoken = await ethers.getContractAt("ERC20", lpAddress);
      });

      after("clean up", async function () {
        const [{ WETH }] = await initMainnetEnv();
        const [deployer] = await ethers.getSigners();
        await cleanUp({ tokens: [WETH], users: [deployer] });
      });

      it("should correctly redeemFees to admin address", async function () {
        await this.contracts.WETH.approve(this.vaultConsumer.address, 10000);
        await this.vaultConsumer.deposit(10000);
        await this.contracts.WETH.transfer(this.contracts.shares.address, 1000); // simulate an increase in GAV to trigger performance fee calculations
        this.timeout(100000);
        // simulate a 1 year passage of time
        await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 * 365]);
        await ethers.provider.send("evm_mine", []);

        // redeem both management and performance fees
        await this.vaultConsumer.redeemFees(
          this.contracts.ENZYME_FEE_MANAGER.address,
          [
            this.contracts.ENZYME_MANAGEMENT_FEE.address,
            this.contracts.ENZYME_PERFORMANCE_FEE.address,
          ]
        );
        const sharesbal = await this.contracts.shares.balanceOf(
          this.vaultConsumer.address
        );
        const lpbalance = await this.contracts.lptoken.totalSupply();
        expect(lpbalance).to.be.equal(sharesbal); // all additional fee shares are spent
        expect(
          await this.contracts.WETH.balanceOf(this.admin.address)
        ).to.be.equal(247);
      });
    });
  });
});
