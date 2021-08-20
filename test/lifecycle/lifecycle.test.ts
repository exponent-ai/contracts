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

import { randomAddress } from "../utils/address.js";
import { kyberTakeOrderArgs } from "@enzymefinance/protocol";
import {
  managementFeeConfigArgs,
  feeManagerConfigArgs,
  performanceFeeConfigArgs,
  convertRateToScaledPerSecondRate,
} from "@enzymefinance/protocol";
import {
  seedBalance,
  initMainnetEnv,
  cleanUp,
  setSnapshot,
} from "../utils/integration-test-setup";
import { Role, grantRole } from "src/role";
import { addAsset } from "src/addAsset";
import { SignalService, defaultSignal } from "src/signal";
import { feeConfig, deployerArgs } from "src/deployer";

describe("XPN life cycle", function () {
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

      [this.contracts] = await initMainnetEnv();

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
      this.signal = new SignalService({
        signalRegistra: defaultSignal,
        contract: this.simpleSignal.connect(this.signalProvider),
      });
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

      const feeManagerConfigData = feeConfig({
        managementFeePercent: "0.015",
        managementFeeAddress: this.contracts.ENZYME_MANAGEMENT_FEE.address,
        performanceFeePercent: "0.1",
        performanceFeeAddress: this.contracts.ENZYME_PERFORMANCE_FEE.address,
      });

      const enzymeContracts = {
        deployer: this.contracts.ENZYME_DEPLOYER.address,
        integrationManager: this.contracts.ENZYME_INT_MANAGER.address,
        trackedAssetAdapter: this.contracts.ENZYME_ASSET_ADAPTER.address,
        policyManager: this.contracts.ENZYME_POLICY_MANAGER.address,
        whitelistPolicy: this.contracts.ENZYME_INVESTOR_WHITELIST.address,
      };

      const constructorArgs = deployerArgs({
        enzyme: enzymeContracts,
        admin: this.admin.address,
        settler: this.settler.address,
        signal: this.simpleSignal.address,
        denomAsset: this.contracts.WETH.address,
        denomSymbol: "WETH",
        tokenSymbol: "EX-ETH",
        feeConfig: feeManagerConfigData,
      });

      this.main = await Main.deploy(constructorArgs, "EX-ETH", "EX-ETH");
      await this.main.deployed();
    });

    it("create signal", async function () {
      await this.signal.register();
    });

    it("submit signal", async function () {
      await this.signal.submit([1, 0, 1]);
    });

    it("set asset whitelist", async function () {
      await grantRole({
        grantor: this.main.connect(this.admin),
        role: Role.AssetWhitelister,
        grantee: this.assetWhitelister.address,
      });

      await addAsset({
        contract: this.main.connect(this.assetWhitelister),
        asset: this.contracts.WBTC.address,
        feed: this.contracts.ORACLE_WBTC_ETH.address,
        symbol: "BTC",
      });

      await addAsset({
        contract: this.main.connect(this.assetWhitelister),
        asset: this.contracts.USDC.address,
        feed: this.contracts.ORACLE_USDC_ETH.address,
        symbol: "USDC",
      });

      await addAsset({
        contract: this.main.connect(this.assetWhitelister),
        asset: this.contracts.WETH.address,
        feed: this.contracts.WETH.address, // contract will ignore denomasset feed
        symbol: "WETH",
      });
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
      await grantRole({
        grantor: this.main.connect(this.admin),
        role: Role.VenueWhitelister,
        grantee: this.venueWhitelister.address,
      });
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
      await ethers.provider.send("evm_mine", []);
      await this.main
        .connect(this.admin)
        .redeemFees(this.contracts.ENZYME_FEE_MANAGER.address, [
          this.contracts.ENZYME_MANAGEMENT_FEE.address,
          this.contracts.ENZYME_PERFORMANCE_FEE.address,
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
