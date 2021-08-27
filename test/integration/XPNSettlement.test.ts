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

import { ethers, network } from "hardhat";
import { expect } from "chai";
import {
  kyberTakeOrderArgs,
  aaveLendArgs,
  aaveRedeemArgs,
} from "@enzymefinance/protocol";
import {
  seedBalance,
  initMainnetEnv,
  cleanUp,
  setSnapshot,
} from "../utils/integration-test-setup";

describe("XPNSettlement", function () {
  before("set up", async function () {
    await setSnapshot();

    [this.signer] = await ethers.getSigners();
    [this.contracts] = await initMainnetEnv();
    this.testVault = process.env.TEST_VAULT;
    this.testComptroller = process.env.TEST_COMPTROLLER;

    const Settler = await ethers.getContractFactory("IntXPNVSettlementSpy");
    this.settler = await Settler.deploy(
      process.env.ENZYME_INT_MANAGER,
      this.testComptroller
    );
    const manager = process.env.TEST_MANAGER;

    this.timeout(100000);
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [manager],
    });
    const signer = await ethers.provider.getSigner(manager);

    await this.contracts.ENZYME_INT_MANAGER.connect(signer).addAuthUserForFund(
      this.testComptroller,
      this.settler.address
    );

    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [manager],
    });
    this.tradeAmount = "1804000000";
  });
  it("can submit a trade", async function () {
    this.timeout(100000);
    const prewethbal = await this.contracts.WETH.balanceOf(this.testVault);
    const preusdcbal = await this.contracts.USDC.balanceOf(this.testVault);
    const kyberArgs = kyberTakeOrderArgs({
      incomingAsset: this.contracts.USDC.address,
      minIncomingAssetAmount: this.tradeAmount,
      outgoingAsset: this.contracts.WETH.address,
      outgoingAssetAmount: ethers.utils.parseEther("1"),
    });
    const kyberVenue = this.contracts.KYBER.address;
    await this.settler.submitTradeOrders(
      Array.of(kyberArgs),
      Array.of(kyberVenue)
    );
    const postwethbal = await this.contracts.WETH.balanceOf(this.testVault);
    const postusdcbal = await this.contracts.USDC.balanceOf(this.testVault);
    expect(prewethbal).to.be.above(postwethbal);
    expect(preusdcbal).to.be.below(postusdcbal);
  });
  it("can submit batched trades", async function () {
    this.timeout(100000);
    const prewethbal = await this.contracts.WETH.balanceOf(this.testVault);
    const preusdcbal = await this.contracts.USDC.balanceOf(this.testVault);
    const kyberArgs = kyberTakeOrderArgs({
      incomingAsset: this.contracts.USDC.address,
      minIncomingAssetAmount: this.tradeAmount,
      outgoingAsset: this.contracts.WETH.address,
      outgoingAssetAmount: ethers.utils.parseEther("1"),
    });
    const kyberVenue = this.contracts.KYBER.address;
    await this.settler.submitTradeOrders(
      Array.of(kyberArgs, kyberArgs),
      Array.of(kyberVenue, kyberVenue)
    );
    const postwethbal = await this.contracts.WETH.balanceOf(this.testVault);
    const postusdcbal = await this.contracts.USDC.balanceOf(this.testVault);
    expect(prewethbal).to.be.above(postwethbal);
    expect(preusdcbal).to.be.below(postusdcbal);
  });
  it("can submit lending transaction", async function () {
    this.timeout(100000);
    this.preusdcbal = await this.contracts.USDC.balanceOf(this.testVault);
    const lendArgs = aaveLendArgs({
      aToken: this.contracts.AUSDC.address,
      amount: this.preusdcbal,
    });
    const aaveVenue = this.contracts.ENZYME_AAVE_ADAPTER.address;
    await this.settler.submitPoolOrders(
      Array.of(lendArgs),
      Array.of(0), // lending tx-type
      Array.of(aaveVenue)
    );
    const postusdcbal = await this.contracts.USDC.balanceOf(this.testVault);
    expect(this.preusdcbal).to.be.above(postusdcbal);
  });
  it("can submit redemption transaction", async function () {
    this.timeout(100000);
    const preusdcbal = await this.contracts.USDC.balanceOf(this.testVault);
    const redeemArgs = aaveLendArgs({
      aToken: this.contracts.AUSDC.address,
      amount: this.preusdcbal.sub(ethers.BigNumber.from(100000000)), // subtrack fees
    });
    const aaveVenue = this.contracts.ENZYME_AAVE_ADAPTER.address;
    await this.settler.submitPoolOrders(
      Array.of(redeemArgs),
      Array.of(1), // redeem tx-type
      Array.of(aaveVenue)
    );
    const postusdcbal = await this.contracts.USDC.balanceOf(this.testVault);
    expect(preusdcbal).to.be.below(postusdcbal);
  });
});
