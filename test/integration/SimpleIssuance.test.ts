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

describe("SimpleIssuance", function () {
  before("deploy contract", async function () {
    await setSnapshot();
    [
      this.admin,
      this.deployer,
      this.settler,
      this.assetWhitelister,
      this.depositor,
      this.vaultManager,
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
    await this.main.connect(this.admin).initializeFundConfig();
    this.amount = "100000000000000000000";
    await seedBalance({
      ticker: "WETH",
      contract: this.contracts.WETH,
      to: this.depositor.address,
      amount: this.amount,
    });

    const Issuance = await ethers.getContractFactory("SimpleIssuance");
    const startGoal = this.amount;
    const lptoken = await this.main.getLPTokenAddress();
    this.contracts.lptoken = await ethers.getContractAt("ERC20", lptoken);
    this.issuance = await Issuance.deploy(
      this.admin.address,
      startGoal,
      this.contracts.WETH.address,
      lptoken,
      this.main.address
    );
    await this.issuance.deployed();
  });

  it("should whitelist simple issuance as sole depositor", async function () {
    await grantRole({
      grantor: this.main.connect(this.admin),
      role: Role.Manager,
      grantee: this.vaultManager.address,
    });
    await this.main.connect(this.vaultManager).setRestricted(true);
    await this.main
      .connect(this.vaultManager)
      .whitelistWallet(this.issuance.address);
    expect(await this.main.isWalletWhitelisted(this.issuance.address)).to.be
      .true;
  });
  it("successfully purchase tickets with WETH", async function () {
    const amount = this.amount;
    await this.contracts.WETH.connect(this.depositor).approve(
      this.issuance.address,
      amount
    );
    await this.issuance.connect(this.depositor).purchaseTicket(amount);
    expect(await this.contracts.WETH.balanceOf(this.issuance.address)).to.equal(
      amount
    );
    expect(
      await this.contracts.WETH.balanceOf(this.depositor.address)
    ).to.equal(0);
    const { totalDeposit } = await this.issuance.roundData(1);
    expect(totalDeposit).to.be.equal(amount);
    const { amount: purchaseAmount, exists } = await this.issuance.userTicket(
      1,
      this.depositor.address
    );
    expect(purchaseAmount).to.be.equal(amount);
    expect(exists).to.be.true;
  });
  it("vault manager issues vault LP tokens from issuance contract", async function () {
    const amount = this.amount;
    await this.issuance.connect(this.admin).issue();
    expect(await this.contracts.WETH.balanceOf(this.issuance.address)).to.equal(
      0
    );
    const shares = await this.main.getSharesAddress();
    expect(await this.contracts.WETH.balanceOf(shares)).to.equal(amount);
    expect(
      await this.contracts.lptoken.balanceOf(this.issuance.address)
    ).to.equal(amount);
  });
  it("should allow user to redeem LP tokens with ticket", async function () {
    const amount = this.amount;
    await this.issuance.connect(this.depositor).redeemTicket(1);
    expect(
      await this.contracts.lptoken.balanceOf(this.issuance.address)
    ).to.equal(0);
    expect(
      await this.contracts.lptoken.balanceOf(this.depositor.address)
    ).to.equal(amount);
  });
});
