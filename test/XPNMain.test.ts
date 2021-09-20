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

import { ethers, waffle, artifacts } from "hardhat";
import { expect } from "chai";
const { deployMockContract } = waffle;
import { randomAddress } from "./utils/address";
import {
  getDenomAsset,
  getLPToken,
  getSignalPool,
  getSignalName,
  getAdmin,
  getShares,
  getComptroller,
  getWhitelistPolicy,
  getPolicyManager,
  getTrackedAssetAdapter,
  getIntegrationManager,
  getDeployer
} from '../src/vaultGetters';

describe("XPNMain", function () {
  beforeEach(async function () {
    [
      this.deployer,
      this.admin,
      this.settler,
      this.venueWhitelister,
      this.assetWhitelister,
      this.manager,
      this.user1,
      this.user2,
    ] = await ethers.getSigners();
    this.mockAddress = randomAddress();
    const MockToken = await artifacts.readArtifact("IERC20");
    this.shares = await deployMockContract(this.deployer, MockToken.abi);
    this.weth = await deployMockContract(this.deployer, MockToken.abi);

    // deploy integration manager mock
    const Intmanager = await artifacts.readArtifact("IIntegrationManager");
    this.intmanager = await deployMockContract(this.deployer, Intmanager.abi);
    // deploy policy manager mock
    const Policymanager = await artifacts.readArtifact("IPolicyManager");
    this.policymanager = await deployMockContract(
      this.deployer,
      Policymanager.abi
    );
    // deploy comptroller mock
    const Comptroller = await artifacts.readArtifact("IComptroller");
    this.comptroller = await deployMockContract(this.deployer, Comptroller.abi);
    // deploy fund deployer
    const Funddeployer = await artifacts.readArtifact("IFundDeployer");
    this.funddeployer = await deployMockContract(
      this.deployer,
      Funddeployer.abi
    );

    const Signal = await artifacts.readArtifact("ISignal");
    this.signal = await deployMockContract(this.deployer, Signal.abi);
    await this.signal.mock.getSignalSymbols
      .withArgs("signal1")
      .returns(["ETH"]);
    const Util = await ethers.getContractFactory("XPNUtils");
    this.util = await Util.deploy();
    await this.util.deployed();
    const Main = await ethers.getContractFactory("XPNMain", {
      libraries: {
        XPNUtils: this.util.address,
      },
    });
    this.whitelistPolicyAddress = randomAddress(); // mock addr
    this.trackedAssetAdapterAddress = randomAddress(); // mock addr
    const constructorArgs = [
      this.admin.address,
      this.settler.address,
      this.signal.address,
      this.weth.address,
      "ETH", // ETH denominated
      this.funddeployer.address,
      this.intmanager.address,
      this.trackedAssetAdapterAddress,
      this.policymanager.address,
      this.whitelistPolicyAddress,
      this.mockAddress,
      this.mockAddress,
      [],
      "EX-ETH",
    ];

    await this.funddeployer.mock.createNewFund.returns(
      this.comptroller.address,
      this.shares.address
    );
    this.main = await Main.deploy(constructorArgs, "EX-ETH", "EX-ETH");
    await this.main.deployed();
    await this.main
      .connect(this.admin)
      .swapSignal(this.signal.address, "signal1");
  });

  describe("Role based access control", async function () {
    describe("Admin", async function () {
      beforeEach(async function () {
        await this.signal.mock.getSignalSymbols
          .withArgs("signal1")
          .returns(["ETH"]);
        await this.intmanager.mock.addAuthUserForFund.returns();
        await this.policymanager.mock.enablePolicyForFund.returns();
      });
      it("only admin can renounce role and replace itself", async function () {
        const newAdmin = randomAddress();
        const adminRole = ethers.constants.HashZero;
        await this.main.connect(this.admin).grantRole(adminRole, newAdmin);
        await this.main
          .connect(this.admin)
          .renounceRole(adminRole, this.admin.address);
        expect(await this.main.getRoleMemberCount(adminRole)).to.be.equal(1);
        expect(await this.main.getRoleMember(adminRole, 0)).to.be.equal(
          newAdmin
        );
      });
      it("only admin can initialize fund config", async function () {
        await expect(this.main.connect(this.settler).initializeFundConfig()).to
          .be.reverted;
        await this.main.connect(this.admin).initializeFundConfig();
      });
      it("only admin can set signal address", async function () {
        await this.signal.mock.getSignalSymbols
          .withArgs("signal1")
          .returns(["ETH"]);
        await expect(
          this.main
            .connect(this.settler)
            .swapSignal(this.signal.address, "signal1")
        ).to.be.reverted;
        await this.main
          .connect(this.admin)
          .swapSignal(this.signal.address, "signal1");
      });
      it("non-admin can't withdraw fees", async function () {
        await expect(this.main.connect(this.settler).redeemFees()).to.be
          .reverted;
      });
      it("only admin can add tracked asset", async function () {
        await this.main.connect(this.admin).initializeFundConfig();
        const trackedAsset = randomAddress();
        await expect(
          this.main.connect(this.settler).addTrackedAsset(trackedAsset)
        ).to.be.reverted;
        await this.comptroller.mock.callOnExtension.returns();
        await this.main.connect(this.admin).addTrackedAsset(trackedAsset);
      });
      it("only admin can remove tracked asset", async function () {
        await this.main.connect(this.admin).initializeFundConfig();
        const trackedAsset = randomAddress();
        await this.comptroller.mock.callOnExtension.returns();
        await this.main.connect(this.admin).addTrackedAsset(trackedAsset);
        await expect(
          this.main.connect(this.settler).removeTrackedAsset(trackedAsset)
        ).to.be.reverted;
        await this.main.connect(this.admin).removeTrackedAsset(trackedAsset);
      });
      it("only admin can swap settler role", async function () {
        const newSettler = randomAddress();
        const settlerRole = ethers.utils.keccak256(
          ethers.utils.toUtf8Bytes("SETTLER_ROLE")
        );
        await expect(
          this.main
            .connect(this.settler)
            .revokeRole(settlerRole, this.settler.address)
        ).to.be.reverted;
        await expect(
          this.main
            .connect(this.settler)
            .grantRole(settlerRole, this.settler.address)
        ).to.be.reverted;

        await this.main
          .connect(this.admin)
          .revokeRole(settlerRole, this.settler.address);
        await this.main.connect(this.admin).grantRole(settlerRole, newSettler);
        expect(await this.main.getRoleMemberCount(settlerRole)).to.be.equal(1);
        expect(await this.main.getRoleMember(settlerRole, 0)).to.be.equal(
          newSettler
        );
      });
      it("only admin can swap manager role", async function () {
        const newManager = randomAddress();
        const managerRole = ethers.utils.keccak256(
          ethers.utils.toUtf8Bytes("MANAGER_ROLE")
        );
        await this.main.connect(this.admin).grantRole(managerRole, newManager);
        await expect(
          this.main
            .connect(this.settler)
            .revokeRole(managerRole, this.settler.address)
        ).to.be.reverted;
        await expect(
          this.main
            .connect(this.settler)
            .grantRole(managerRole, this.settler.address)
        ).to.be.reverted;
        await this.main.connect(this.admin).revokeRole(managerRole, newManager);
        await this.main.connect(this.admin).grantRole(managerRole, newManager);
        expect(await this.main.getRoleMemberCount(managerRole)).to.be.equal(1);
        expect(await this.main.getRoleMember(managerRole, 0)).to.be.equal(
          newManager
        );
      });
      it("only admin can swap venue whitelister role", async function () {
        const newWhitelister = randomAddress();
        const whitelisterRole = ethers.utils.keccak256(
          ethers.utils.toUtf8Bytes("VENUE_WHITELIST_ROLE")
        );
        await this.main
          .connect(this.admin)
          .grantRole(whitelisterRole, newWhitelister);
        await expect(
          this.main
            .connect(this.settler)
            .revokeRole(whitelisterRole, this.settler.address)
        ).to.be.reverted;
        await expect(
          this.main
            .connect(this.settler)
            .grantRole(whitelisterRole, this.settler.address)
        ).to.be.reverted;
        await this.main
          .connect(this.admin)
          .revokeRole(whitelisterRole, newWhitelister);
        await this.main
          .connect(this.admin)
          .grantRole(whitelisterRole, newWhitelister);
        expect(await this.main.getRoleMemberCount(whitelisterRole)).to.be.equal(
          1
        );
        expect(await this.main.getRoleMember(whitelisterRole, 0)).to.be.equal(
          newWhitelister
        );
      });
      it("only admin can swap asset whitelister role", async function () {
        const newWhitelister = randomAddress();
        const whitelisterRole = ethers.utils.keccak256(
          ethers.utils.toUtf8Bytes("ASSET_WHITELIST_ROLE")
        );
        await this.main
          .connect(this.admin)
          .grantRole(whitelisterRole, newWhitelister);
        await expect(
          this.main
            .connect(this.settler)
            .revokeRole(whitelisterRole, this.settler.address)
        ).to.be.reverted;
        await expect(
          this.main
            .connect(this.settler)
            .grantRole(whitelisterRole, this.settler.address)
        ).to.be.reverted;
        await this.main
          .connect(this.admin)
          .revokeRole(whitelisterRole, newWhitelister);
        await this.main
          .connect(this.admin)
          .grantRole(whitelisterRole, newWhitelister);
        expect(await this.main.getRoleMemberCount(whitelisterRole)).to.be.equal(
          1
        );
        expect(await this.main.getRoleMember(whitelisterRole, 0)).to.be.equal(
          newWhitelister
        );
      });
    });

    describe("Settler", async function () {
      beforeEach(async function () {
        await this.signal.mock.getSignalSymbols
          .withArgs("signal1")
          .returns(["ETH"]);
        await this.intmanager.mock.addAuthUserForFund.returns();
        await this.policymanager.mock.enablePolicyForFund.returns();
      });
      it("does not allow non-settler address to make trades", async function () {
        await expect(
          this.main
            .connect(this.admin)
            .submitTradeOrders([""], [randomAddress()])
        ).to.be.reverted;
      });
      it("allows settler address to make trades", async function () {});
    });

    describe("Manager", async function () {
      beforeEach(async function () {
        this.managerRole = ethers.utils.keccak256(
          ethers.utils.toUtf8Bytes("MANAGER_ROLE")
        );
        await this.main
          .connect(this.admin)
          .grantRole(this.managerRole, this.manager.address);
      });

      it("only manager can toggle restricted mode", async function () {
        await expect(this.main.connect(this.settler).setRestricted(true)).to.be
          .reverted;
        await this.main.connect(this.manager).setRestricted(true);
        expect(await this.main.isRestricted()).to.be.true;

        await expect(this.main.connect(this.settler).setRestricted(false)).to.be
          .reverted;
        await this.main.connect(this.manager).setRestricted(false);
        expect(await this.main.isRestricted()).to.be.false;
      });

      it("only manager can whitelist wallets", async function () {
        const wallet = randomAddress();
        await expect(this.main.connect(this.settler).whitelistWallet(wallet)).to
          .be.reverted;
        await this.main.connect(this.manager).whitelistWallet(wallet);
        expect(await this.main.isWalletWhitelisted(wallet)).to.be.true;
      });

      it("only manager can blacklist wallets", async function () {
        const wallet = randomAddress();
        await this.main.connect(this.manager).whitelistWallet(wallet);
        await expect(this.main.connect(this.settler).deWhitelistWallet(wallet))
          .to.be.reverted;
        await this.main.connect(this.manager).deWhitelistWallet(wallet);
        expect(await this.main.isWalletWhitelisted(wallet)).to.be.false;
      });

      it("with restricted mode on, non whitelisted user can't deposit", async function () {
        await this.main.connect(this.manager).setRestricted(true);
        await expect(this.main.connect(this.user1).deposit(1000)).to.be
          .reverted;
      });
    });

    describe("VenueWhitelister", async function () {
      beforeEach(async function () {
        this.venueWhitelisterRole = ethers.utils.keccak256(
          ethers.utils.toUtf8Bytes("VENUE_WHITELIST_ROLE")
        );
        await this.main
          .connect(this.admin)
          .grantRole(this.venueWhitelisterRole, this.venueWhitelister.address);
      });

      it("only whitelister can whitelist venue", async function () {
        const venue = randomAddress();
        await expect(this.main.connect(this.settler).whitelistVenue(venue)).to
          .be.reverted;
        await this.main.connect(this.venueWhitelister).whitelistVenue(venue);
        expect(await this.main.isVenueWhitelisted(venue)).to.be.true;
      });
      it("only whitelister can dewhitelist venue", async function () {
        const venue = randomAddress();
        await this.main.connect(this.venueWhitelister).whitelistVenue(venue);
        await expect(this.main.connect(this.settler).deWhitelistVenue(venue)).to
          .be.reverted;
        await this.main.connect(this.venueWhitelister).deWhitelistVenue(venue);
        expect(await this.main.isVenueWhitelisted(venue)).to.be.false;
      });
    });

    describe("AssetWhitelister", async function () {
      beforeEach(async function () {
        this.assetWhitelisterRole = ethers.utils.keccak256(
          ethers.utils.toUtf8Bytes("ASSET_WHITELIST_ROLE")
        );
        await this.main
          .connect(this.admin)
          .grantRole(this.assetWhitelisterRole, this.assetWhitelister.address);
      });
      it("only whitelister can whitelist asset", async function () {
        const asset = randomAddress();
        await expect(this.main.connect(this.settler).whitelistAsset(asset)).to
          .be.reverted;
        await this.main.connect(this.assetWhitelister).whitelistAsset(asset);
        expect(await this.main.isAssetWhitelisted(asset)).to.be.true;
      });
      it("only whitelister can dewhitelist asset", async function () {
        const asset = randomAddress();
        await this.main.connect(this.assetWhitelister).whitelistAsset(asset);
        await expect(this.main.connect(this.settler).deWhitelistAsset(asset)).to
          .be.reverted;
        await this.main.connect(this.assetWhitelister).deWhitelistAsset(asset);
        expect(await this.main.isAssetWhitelisted(asset)).to.be.false;
      });
    });
  });

  describe("Settler", async function () {
    it("only settler can call submitTrustedTradeOrders", async function () {
      await expect(
        this.main
          .connect(this.assetWhitelister)
          .submitTrustedTradeOrders(["0x"], [randomAddress()])
      ).to.be.reverted;
      await expect(
        this.main
          .connect(this.settler)
          .submitTrustedTradeOrders(["0x"], [randomAddress()])
      ).to.be.revertedWith("XPNSettlement: venue is not whitelisted");
    });
    it("only settler can call submitTrustedPoolOrders", async function () {
      await expect(
        this.main
          .connect(this.assetWhitelister)
          .submitTrustedPoolOrders(["0x"], [0], [randomAddress()])
      ).to.be.reverted;
      await expect(
        this.main
          .connect(this.settler)
          .submitTrustedPoolOrders(["0x"], [0], [randomAddress()])
      ).to.be.revertedWith("XPNSettlement: venue is not whitelisted");
    });
  });

  describe("state getters", async function () {
    beforeEach( async function () {
      this.exponentConfig = await this.main.getExponentConfig()
      this.enzymeConfig = await this.main.getEnzymeConfig();
    })
    it("should get denominated asset", async function () {
      expect(getDenomAsset(this.exponentConfig)).to.be.equal(
        this.weth.address
      );
    });
    it("should get lp token address", async function () {
      expect(getLPToken(this.exponentConfig)).to.not.be.null;
    });
    it("should get shares address", async function () {
      expect(getShares(this.enzymeConfig)).to.not.be.null;
    });
    it("should get current signal name", async function () {
      expect(getSignalName(this.exponentConfig)).to.be.equal("signal1");
    });
    it("should get signal pool address", async function () {
      expect(getSignalPool(this.exponentConfig)).to.be.equal(this.signal.address);
    });
    it("should get enzyme whitelist policy address", async function () {
      expect(getWhitelistPolicy(this.enzymeConfig)).to.be.equal(
        this.whitelistPolicyAddress
      );
    });
    it("should get enzyme policy address", async function () {
      expect(getPolicyManager(this.enzymeConfig)).to.be.equal(
        this.policymanager.address
      );
    });
    it("should get enzyme tracked asset adapter address", async function () {
      expect(getTrackedAssetAdapter(this.enzymeConfig)).to.be.equal(
        this.trackedAssetAdapterAddress
      );
    });
    it("should get enzyme integration manager address", async function () {
      expect(getIntegrationManager(this.enzymeConfig)).to.be.equal(
        this.intmanager.address
      );
    });
    it("should get enzyme deployer address", async function () {
      expect(getDeployer(this.enzymeConfig)).to.be.equal(
        this.funddeployer.address
      );
    });
    it("should get enzyme comptroller address", async function () {
      expect(getComptroller(this.enzymeConfig)).to.not.be.null;
    });
    it("should get admin address", async function () {
      expect(getAdmin(this.exponentConfig)).to.be.equal(this.admin.address);
    });
  });

  describe("status getters", async function () {
    it("should check if config has been initialized", async function () {
      await this.intmanager.mock.addAuthUserForFund.returns();
      await this.policymanager.mock.enablePolicyForFund.returns();
      expect(await this.main.isConfigInitialized()).to.be.false;
      await this.main.connect(this.admin).initializeFundConfig();
      expect(await this.main.isConfigInitialized()).to.be.true;
    });
  });
});
