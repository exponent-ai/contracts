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

import * as dotenv from "dotenv";
import { ethers } from "hardhat";
import { expect } from "chai";
import { kyberTakeOrderArgs } from "@enzymefinance/protocol";
import { randomAddress } from "../utils/address";
import {
  seedBalance,
  initMainnetEnv,
  setSnapshot,
} from "../utils/integration-test-setup";
import { Role, grantRole } from "src/role";
import { addAsset } from "src/addAsset";
import { SignalService, defaultSignal } from "src/signal";
import { feeConfig, deployerArgs } from "src/deployer";
import { getShares } from "src/vaultGetters";

dotenv.config();

describe("XPNMain", function () {
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
    [this.contracts] = await initMainnetEnv();
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
    this.signal = new SignalService({
      signalRegistra: {
        name: "testsignal1",
        metadata: "Simple",
        symbols: ["WETH", "USDC"],
      },
      contract: this.simpleSignal.connect(this.admin),
    });
    await this.signal.register();
    await this.signal.submit([1, 1]);

    const feeManagerConfigData = feeConfig({
      managementFeePercent: "0.015",
      managementFeeAddress: this.contracts.ENZYME_MANAGEMENT_FEE.address,
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
      signalName: "testsignal1",
      denomAsset: this.contracts.WETH.address,
      denomSymbol: "WETH",
      tokenSymbol: "EX-ETH",
      feeConfig: feeManagerConfigData,
    });

    this.main = await Main.deploy(constructorArgs, "EX-ETH", "EX-ETH");
    await this.main.deployed();

    await grantRole({
      grantor: this.main.connect(this.admin),
      role: Role.AssetWhitelister,
      grantee: this.assetWhitelister.address,
    });

    await grantRole({
      grantor: this.main.connect(this.admin),
      role: Role.VenueWhitelister,
      grantee: this.venueWhitelister.address,
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

    await this.main.swapSignal(this.simpleSignal.address, "testsignal1");
    await seedBalance({
      ticker: "WETH",
      contract: this.contracts.WETH,
      to: this.depositor.address,
      amount: "100000000000000000000",
    });

    await this.main
      .connect(this.venueWhitelister)
      .whitelistVenue(this.contracts.KYBER.address);
  });
  describe("submitTradeOrders", async function () {
    it("it should fail when signal is different from the post-trade balance", async function () {
      this.timeout(100000);
      const depositAmount = ethers.utils.parseUnits("1", 18);
      await this.contracts.WETH.connect(this.depositor).approve(
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
      this.enzymeConfig = await this.main.getEnzymeConfig();
      const prewethbal = await this.contracts.WETH.balanceOf(
        getShares(this.enzymeConfig)
      );
      const preusdcbal = await this.contracts.USDC.balanceOf(
        getShares(this.enzymeConfig)
      );
      const kyberArgs = kyberTakeOrderArgs({
        incomingAsset: this.contracts.USDC.address,
        minIncomingAssetAmount: this.tradeAmount,
        outgoingAsset: this.contracts.WETH.address,
        outgoingAssetAmount: ethers.utils.parseEther("1"),
      });
      const kyberVenue = this.contracts.KYBER.address;
      await expect(
        this.main
          .connect(this.settler)
          .submitTradeOrders(Array.of(kyberArgs), Array.of(kyberVenue))
      ).to.be.revertedWith("trade requirement not satisfied");
    });
    it("it should fail when a signal provides an unsupported asset", async function () {
      this.timeout(100000);
      const depositAmount = ethers.utils.parseUnits("1", 18);
      await this.contracts.WETH.connect(this.depositor).approve(
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
      const prewethbal = await this.contracts.WETH.balanceOf(
        getShares(this.enzymeConfig)
      );
      const preusdcbal = await this.contracts.USDC.balanceOf(
        getShares(this.enzymeConfig)
      );
      const kyberArgs = kyberTakeOrderArgs({
        incomingAsset: this.contracts.USDC.address,
        minIncomingAssetAmount: this.tradeAmount,
        outgoingAsset: this.contracts.WETH.address,
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
      await this.contracts.WETH.connect(this.depositor).approve(
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
      const prewethbal = await this.contracts.WETH.balanceOf(
        getShares(this.enzymeConfig)
      );
      const preusdcbal = await this.contracts.USDC.balanceOf(
        getShares(this.enzymeConfig)
      );
      const kyberArgs = kyberTakeOrderArgs({
        incomingAsset: this.contracts.USDC.address,
        minIncomingAssetAmount: this.tradeAmount,
        outgoingAsset: this.contracts.WETH.address,
        outgoingAssetAmount: ethers.utils.parseEther("1"),
      });
      const kyberVenue = this.contracts.KYBER.address;
      await this.main
        .connect(this.settler)
        .submitTradeOrders(Array.of(kyberArgs), Array.of(kyberVenue));
    });
  });
});
