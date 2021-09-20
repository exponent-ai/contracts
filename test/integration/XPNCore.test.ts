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
import { ethers, network } from "hardhat";
import { expect } from "chai";
import {
  managementFeeConfigArgs,
  feeManagerConfigArgs,
  performanceFeeConfigArgs,
  validateRulePreBuySharesArgs,
  convertRateToScaledPerSecondRate,
} from "@enzymefinance/protocol";
import {
  seedBalance,
  initMainnetEnv,
  cleanUp,
  setSnapshot,
  getDeployedContractBytes,
} from "../utils/integration-test-setup";

dotenv.config();

describe("XPNCore", function () {
  beforeEach("deploy contract", async function () {
    await setSnapshot();
    [this.deployer, this.settler, this.settler2, this.admin, this.depositor] =
      await ethers.getSigners();
    [this.contracts, this.wallets, this.transactions] = await initMainnetEnv();
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
      this.contracts.WETH.address,
      "ETH",
      this.contracts.ENZYME_DEPLOYER.address,
      this.contracts.ENZYME_INT_MANAGER.address,
      this.contracts.ENZYME_ASSET_ADAPTER.address,
      this.contracts.ENZYME_POLICY_MANAGER.address, // policy manager
      this.contracts.ENZYME_INVESTOR_WHITELIST.address, // investor whitelist
      ethers.constants.AddressZero,
      ethers.constants.AddressZero,
      [],
      "EX-ETH",
    ];

    this.core = await Core.deploy(constructorArgs, "EX-ETH", "EX-ETH");
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
      await this.core.addTrackedAsset(this.contracts.USDC.address);
      expect(await shares.isTrackedAsset(this.contracts.WETH.address)).to.be
        .true;
      expect(await shares.isTrackedAsset(this.contracts.USDC.address)).to.be
        .true;
    });
    it("should remove tracked asset", async function () {
      const sharesAddress = await this.core.getSharesAddress();
      const shares = await ethers.getContractAt("IShares", sharesAddress);
      await this.core.removeTrackedAsset(this.contracts.USDC.address);
      expect(await shares.isTrackedAsset(this.contracts.WETH.address)).to.be
        .true;
      expect(await shares.isTrackedAsset(this.contracts.USDC.address)).to.be
        .false;
    });
  });
  describe("Vault migration", async function () {
    it("should perform vault migration successfully", async function () {
      // deploy a new FundDeployer contract
      const deployerTxHash = this.transactions.ENZYME_DEPLOYER_DEPLOYMENT;
      const comptrollerLibTxHash =
        this.transactions.ENZYME_COMPTROLLERLIB_DEPLOYMENT;

      const newDeployer = await getDeployedContractBytes(
        deployerTxHash,
        "IFundDeployer",
        this.deployer
      );
      await newDeployer.deployed();

      // // NOTE here we have to modify ComptrollerLib contract data
      // // comptroller lib has a hardcoded address on deployment, here we simply replace old
      // // fund deployer address with our new fund deployer
      const oldDeployerAddress = this.contracts.ENZYME_DEPLOYER.address;
      const newComptrollerLib = await getDeployedContractBytes(
        comptrollerLibTxHash,
        "IComptroller",
        this.deployer,
        function (bytes: string) {
          return bytes.replace(
            oldDeployerAddress.toLowerCase().replace("0x", ""),
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
        this.contracts.WETH.address,
        "ETH",
        newDeployer.address, // our new fund deployer contract
        this.contracts.ENZYME_INT_MANAGER.address,
        this.contracts.ENZYME_ASSET_ADAPTER.address,
        this.contracts.ENZYME_POLICY_MANAGER.address,
        this.contracts.ENZYME_INVESTOR_WHITELIST.address,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        [],
        "EX-ETH",
      ];

      const enzymeDispatcherOwner =
        this.wallets.ENZYME_DISPATCHER_OWNER.address;

      // NOTE now we begin the process to set up the new release
      // impersonate dispatcher's owner to setCurrentFundDeployer to our new contract
      await network.provider.request({
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
        this.contracts.ENZYME_DISPATCHER.address,
        dispatcherInterface,
        dispatcherOwner
      );

      // set the new comptrollerLib address on the new fund deployer
      await newDeployer
        .connect(this.deployer)
        .setComptrollerLib(newComptrollerLib.address);

      // set the release status on fund deployer as 'LIVE'
      await newDeployer.connect(this.deployer).setReleaseStatus(1);

      // set the current the newest release on dispatcher as our new fund deployer
      await dispatcher.setCurrentFundDeployer(newDeployer.address);

      await network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [enzymeDispatcherOwner],
      });

      const approveAmount = 20000;
      const depositAmount = 10000;

      await seedBalance({
        ticker: "WETH",
        contract: this.contracts.WETH,
        to: this.depositor.address,
        amount: depositAmount,
      });

      await this.core.initializeFundConfig();

      await this.contracts.WETH.connect(this.depositor).approve(
        this.core.address,
        approveAmount
      );

      await this.core.connect(this.depositor).deposit(depositAmount); //deposit should work
      const oldVaultAddress = await this.core.getSharesAddress();
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
        await this.contracts.WETH.balanceOf(this.depositor.address)
      ).to.be.equal(depositAmount);

      const migrationTime = await dispatcher.getMigrationTimelock();
      // // simulate passage of time required for the migration to pass
      await ethers.provider.send("evm_increaseTime", [
        migrationTime.toNumber(),
      ]);
      await ethers.provider.send("evm_mine", []);
      await expect(this.core.executeMigration()).to.emit(
        this.core,
        "MigrationExecuted"
      );

      await this.core.connect(this.depositor).deposit(depositAmount); //deposit should work

      await this.core.connect(this.depositor).withdraw(depositAmount); //withdrawal should still work
      expect(
        await this.contracts.WETH.balanceOf(this.depositor.address)
      ).to.be.equal(depositAmount);
    });
  });
});
