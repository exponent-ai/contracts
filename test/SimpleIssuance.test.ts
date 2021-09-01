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
import { Stage } from "../src/issuance";

describe("SimpleIssuance", function () {
  describe("Happy Path Scenarios", function () {
    before("deployment", async function () {
      [this.deployer, this.alice, this.bob, this.issuanceManager] =
        await ethers.getSigners();
      const Issuance = await ethers.getContractFactory("SimpleIssuance");
      const MockToken = await ethers.getContractFactory("LPToken");
      const MockVault = await ethers.getContractFactory("MockXPNVault");
      this.USDC = await MockToken.deploy("USDC", "USDC");
      this.vault = await MockVault.deploy(this.USDC.address);
      this.USDC.deployed();
      this.vault.deployed();
      this.vaultToken = await ethers.getContractAt(
        "LPToken",
        await this.vault.vaultToken()
      );
      const startGoal = 100000;

      this.issuance = await Issuance.deploy(
        this.issuanceManager.address,
        startGoal,
        this.USDC.address,
        this.vaultToken.address,
        this.vault.address
      );
      await this.issuance.deployed();
    });
    it("ROUND 1", async function () {
      const firstround = await this.issuance.currentRoundId();
      expect(firstround).to.equal("1");
      // first round start at stage 1:Started
      this.currRound = await this.issuance.roundData(firstround);
      expect(this.currRound.stage).to.equal(Stage.Started);
      // alice purchase 50000 USDC for ticket
      await this.USDC.mint(this.alice.address, 50000);
      await this.USDC.connect(this.alice).approve(this.issuance.address, 50000);
      await this.issuance.connect(this.alice).purchaseTicket(50000);
      // current round is in stage 1:Started
      this.currRound = await this.issuance.roundData(firstround);
      expect(this.currRound.stage).to.equal(Stage.Started);
      // bob purchase 50000 USDC for his ticket
      await this.USDC.mint(this.bob.address, 50000);
      await this.USDC.connect(this.bob).approve(this.issuance.address, 50000);
      await this.issuance.connect(this.bob).purchaseTicket(50000);
      // current round is in stage 2:GoalMet
      this.currRound = await this.issuance.roundData(firstround);
      expect(this.currRound.stage).to.equal(Stage.GoalMet);
      // bob sell his ticket for 50000 USDC
      await this.issuance.connect(this.bob).sellTicket(50000);
      // current round is now in stage 1:Started
      this.currRound = await this.issuance.roundData(firstround);
      expect(this.currRound.stage).to.equal(Stage.Started);
      // bob purchase 50000 for his ticket again
      await this.USDC.connect(this.bob).approve(this.issuance.address, 50000);
      await this.issuance.connect(this.bob).purchaseTicket(50000);
      // current round is now back in stage 2:GoalMet
      this.currRound = await this.issuance.roundData(firstround);
      expect(this.currRound.stage).to.equal(Stage.GoalMet);
      // manager calls issue: supposed the vault returns 200K vault tokens
      await this.vault.setMintAmount(200000);
      await this.issuance.connect(this.issuanceManager).issue();
      // round 1 status is stage 3:End
      const postIssuance = await this.issuance.roundData(1);
      expect(postIssuance.stage).to.equal(Stage.End);
      // bob redeemTickets for the first round
      // alice redeemTickets for the first round
      await this.issuance.connect(this.bob).redeemTicket(1);
      await this.issuance.connect(this.alice).redeemTicket(1);
    })
    it("ROUND 2", async function () {
      const secondround = await this.issuance.currentRoundId();
      this.currRound = await this.issuance.roundData(secondround);
      expect(this.currRound.stage).to.equal(Stage.Started);
      expect(await this.vaultToken.balanceOf(this.alice.address)).to.equal(
        100000
      );
      expect(await this.vaultToken.balanceOf(this.bob.address)).to.equal(100000);
      // issuance manager sets current round goal higher
      await this.issuance
        .connect(this.issuanceManager)
        .setCurrentRoundGoal(200000);
      // alice purchaseTickets into 2nd round
      await this.USDC.mint(this.alice.address, 50000);
      await this.USDC.connect(this.alice).approve(this.issuance.address, 50000);
      await this.issuance.connect(this.alice).purchaseTicket(50000);
      // issuance manager readjust the goal to meet current purchase amount
      await this.issuance
        .connect(this.issuanceManager)
        .setCurrentRoundGoal(50000);
      // goal should be met for round 2
      this.currRound = await this.issuance.roundData(secondround);
      expect(this.currRound.stage).to.equal(Stage.GoalMet);
      await this.vault.setMintAmount(100000);
      await this.issuance.connect(this.issuanceManager).issue();
      // bob purchase ticket with 50000 USDC into 3rd round
      await this.USDC.mint(this.bob.address, 50000);
      await this.USDC.connect(this.bob).approve(this.issuance.address, 50000);
      await this.issuance.connect(this.bob).purchaseTicket(50000);
    })
    it("ROUND 3", async function () {
      const secondround = '2';
      const thirdround = await this.issuance.currentRoundId();
      this.currRound = await this.issuance.roundData(thirdround);
      expect(this.currRound.stage).to.equal(Stage.GoalMet);
      await this.vault.setMintAmount(100000);
      await this.issuance.connect(this.issuanceManager).issue();
      // alice redeemTicketed tokens from 2nd round
      // bob redeemTicketed tokens from 3rd round
      await this.issuance.connect(this.alice).redeemTicket(secondround);
      await this.issuance.connect(this.bob).redeemTicket(thirdround);
    })
    it("CHECK FINAL BALANCE", async function () {
      // in total alice should receive 200K LP tokens
      expect(await this.vaultToken.balanceOf(this.alice.address)).to.equal(200000);
      // in total bob should receive 200K LP tokens
      expect(await this.vaultToken.balanceOf(this.bob.address)).to.equal(200000);
    })
  })
  describe("setCurrentRoundGoal", function () {
    beforeEach(async function () {
      [this.deployer, this.alice, this.bob, this.issuanceManager] =
        await ethers.getSigners();
      const Issuance = await ethers.getContractFactory("SimpleIssuance");
      const MockToken = await ethers.getContractFactory("LPToken");
      const MockVault = await ethers.getContractFactory("MockXPNVault");
      this.USDC = await MockToken.deploy("USDC", "USDC");
      this.vault = await MockVault.deploy(this.USDC.address);
      this.USDC.deployed();
      this.vault.deployed();
      this.vaultToken = await ethers.getContractAt(
        "LPToken",
        await this.vault.vaultToken()
      );
      const startGoal = 100000;

      this.issuance = await Issuance.deploy(
        this.issuanceManager.address,
        startGoal,
        this.USDC.address,
        this.vaultToken.address,
        this.vault.address
      );
      await this.issuance.deployed();
    });
    it("cannot be called by an account without issuance manager role", async function () {
      await expect(this.issuance.setCurrentRoundGoal(1000)).to.be.reverted;
    });
    it("correctly sets the current round goal", async function () {
      await this.issuance
        .connect(this.issuanceManager)
        .setCurrentRoundGoal(1000);
      const { goal } = await this.issuance.roundData(1);
      expect(goal).to.equal(1000);
    });
    it("does not change current stage if the goal is not met", async function () {
      await this.USDC.mint(this.bob.address, 50000);
      await this.USDC.connect(this.bob).approve(this.issuance.address, 50000);
      await this.issuance.connect(this.bob).purchaseTicket(50000);
      const { stage: prevStage } = await this.issuance.roundData(1);
      expect(prevStage).to.equal(Stage.Started);
      await this.issuance
        .connect(this.issuanceManager)
        .setCurrentRoundGoal(70000);
      const { stage: postStage } = await this.issuance.roundData(1);
      expect(postStage).to.equal(Stage.Started);
    });
    it("does change current stage if the goal is met", async function () {
      await this.USDC.mint(this.bob.address, 50000);
      await this.USDC.connect(this.bob).approve(this.issuance.address, 50000);
      await this.issuance.connect(this.bob).purchaseTicket(50000);
      const { stage: prevStage } = await this.issuance.roundData(1);
      expect(prevStage).to.equal(Stage.Started);
      await this.issuance
        .connect(this.issuanceManager)
        .setCurrentRoundGoal(50000);
      const { stage: postStage } = await this.issuance.roundData(1);
      expect(postStage).to.equal(Stage.GoalMet);
    });
  });
  describe("purchaseTicket", function () {
    beforeEach(async function () {
      [this.deployer, this.alice, this.bob, this.issuanceManager] =
        await ethers.getSigners();
      const Issuance = await ethers.getContractFactory("SimpleIssuance");
      const MockToken = await ethers.getContractFactory("LPToken");
      const MockVault = await ethers.getContractFactory("MockXPNVault");
      this.USDC = await MockToken.deploy("USDC", "USDC");
      this.vault = await MockVault.deploy(this.USDC.address);
      this.USDC.deployed();
      this.vault.deployed();
      this.vaultToken = await ethers.getContractAt(
        "LPToken",
        await this.vault.vaultToken()
      );
      const startGoal = 100000;

      this.issuance = await Issuance.deploy(
        this.issuanceManager.address,
        startGoal,
        this.USDC.address,
        this.vaultToken.address,
        this.vault.address
      );
      await this.issuance.deployed();
    });
    it("does not allow zero amount", async function () {
      await expect(
        this.issuance.connect(this.alice).purchaseTicket(0)
      ).to.be.revertedWith("issuance: amount can't be zero");
    });
    it("does not allow total amount to exceed goal", async function () {
      this.USDC.mint(this.alice.address, 100001);
      await this.USDC.connect(this.alice).approve(
        this.issuance.address,
        100001
      );
      await expect(
        this.issuance.connect(this.alice).purchaseTicket(100001)
      ).to.be.revertedWith("issuance: total deposits exceeded goal");
    });
    it("does not change current stage if the goal is not met", async function () {
      this.USDC.mint(this.alice.address, 10000);
      await this.USDC.connect(this.alice).approve(this.issuance.address, 10000);
      await this.issuance.connect(this.alice).purchaseTicket(10000);
      const { stage } = await this.issuance.roundData(1);
      expect(stage).to.equal(Stage.Started);
    });
    it("does change current stage if the goal is met", async function () {
      this.USDC.mint(this.alice.address, 100000);
      await this.USDC.connect(this.alice).approve(
        this.issuance.address,
        100000
      );
      await this.issuance.connect(this.alice).purchaseTicket(100000);
      const { stage } = await this.issuance.roundData(1);
      expect(stage).to.equal(Stage.GoalMet);
    });
    it("correctly creates and increments user ticket", async function () {
      this.USDC.mint(this.alice.address, 20000);
      await this.USDC.connect(this.alice).approve(this.issuance.address, 20000);
      await this.issuance.connect(this.alice).purchaseTicket(10000);
      const { amount: prevAmount } = await this.issuance.userTicket(
        1,
        this.alice.address
      );
      expect(prevAmount).to.equal(10000);
      await this.issuance.connect(this.alice).purchaseTicket(10000);
      const { amount: postAmount } = await this.issuance.userTicket(
        1,
        this.alice.address
      );
      expect(postAmount).to.equal(20000);
    });
  });
  describe("sellTicket", function () {
    beforeEach(async function () {
      [this.deployer, this.alice, this.bob, this.issuanceManager] =
        await ethers.getSigners();
      const Issuance = await ethers.getContractFactory("SimpleIssuance");
      const MockToken = await ethers.getContractFactory("LPToken");
      const MockVault = await ethers.getContractFactory("MockXPNVault");
      this.USDC = await MockToken.deploy("USDC", "USDC");
      this.vault = await MockVault.deploy(this.USDC.address);
      this.USDC.deployed();
      this.vault.deployed();
      this.vaultToken = await ethers.getContractAt(
        "LPToken",
        await this.vault.vaultToken()
      );
      const startGoal = 100000;

      this.issuance = await Issuance.deploy(
        this.issuanceManager.address,
        startGoal,
        this.USDC.address,
        this.vaultToken.address,
        this.vault.address
      );
      await this.issuance.deployed();
      this.USDC.mint(this.alice.address, 10000);
      await this.USDC.connect(this.alice).approve(this.issuance.address, 10000);
      await this.issuance.connect(this.alice).purchaseTicket(10000);
    });
    it("can't sell a ticket that does not exist", async function () {
      const { exists } = await this.issuance.userTicket(1, this.bob.address);
      await expect(exists).to.be.false;
      await expect(
        this.issuance.connect(this.bob).sellTicket(10000)
      ).to.be.revertedWith("issuance: ticket for user does not exist");
    });
    it("can't sell a ticket that had all been sold", async function () {
      await this.issuance.connect(this.alice).sellTicket(10000);
      const { exists } = await this.issuance.userTicket(1, this.alice.address);
      await expect(exists).to.be.false;
      await expect(
        this.issuance.connect(this.alice).sellTicket(10000)
      ).to.be.revertedWith("issuance: ticket for user does not exist");
    });
    it("won't sell ticket at an amount higher than purchased", async function () {
      await expect(
        this.issuance.connect(this.alice).sellTicket(12000)
      ).to.be.revertedWith("issuance: can't sell more than current ticket amount");
    });
    it("won't sell a ticket that had been redeemed", async function () {
      const { exists } = await this.issuance.userTicket(1, this.alice.address);
      await expect(exists).to.be.true;
      await this.issuance
        .connect(this.issuanceManager)
        .setCurrentRoundGoal(10000);
      await this.issuance.connect(this.issuanceManager).issue();
      await this.issuance.connect(this.alice).redeemTicket(1);
      const { exists: postIssuance } = await this.issuance.userTicket(
        1,
        this.alice.address
      );
      await expect(postIssuance).to.be.true;
      await expect(this.issuance.connect(this.bob).sellTicket(10000)).to.be
        .reverted;
    });
    it("sets current stage back to started if goal was met before selling", async function () {
      await this.issuance
        .connect(this.issuanceManager)
        .setCurrentRoundGoal(10000);
      const { stage: prevStage } = await this.issuance.roundData(1);
      expect(prevStage).to.equal(Stage.GoalMet);
      await this.issuance.connect(this.alice).sellTicket(5000);
      const { stage: postStage } = await this.issuance.roundData(1);
      expect(postStage).to.equal(Stage.Started);
    });
    it("correctly decrement user ticket and seller receives correct amount back", async function () {
      await this.issuance.connect(this.alice).sellTicket(5000);
      const { amount: prevAmount } = await this.issuance.userTicket(
        1,
        this.alice.address
      );
      expect(prevAmount).to.equal(5000);
      expect(await this.USDC.balanceOf(this.alice.address)).to.equal(5000);
      await this.issuance.connect(this.alice).sellTicket(5000);
      const { amount: postAmount } = await this.issuance.userTicket(
        1,
        this.alice.address
      );
      expect(postAmount).to.equal(0);
      expect(await this.USDC.balanceOf(this.alice.address)).to.equal(10000);
    });
  });
  describe("issuance", function () {
    beforeEach(async function () {
      [this.deployer, this.alice, this.bob, this.issuanceManager] =
        await ethers.getSigners();
      const Issuance = await ethers.getContractFactory("SimpleIssuance");
      const MockToken = await ethers.getContractFactory("LPToken");
      const MockVault = await ethers.getContractFactory("MockXPNVault");
      this.USDC = await MockToken.deploy("USDC", "USDC");
      this.vault = await MockVault.deploy(this.USDC.address);
      this.USDC.deployed();
      this.vault.deployed();
      this.vaultToken = await ethers.getContractAt(
        "LPToken",
        await this.vault.vaultToken()
      );
      const startGoal = 10000;

      this.issuance = await Issuance.deploy(
        this.issuanceManager.address,
        startGoal,
        this.USDC.address,
        this.vaultToken.address,
        this.vault.address
      );
      await this.issuance.deployed();
      this.USDC.mint(this.alice.address, 10000);
      await this.USDC.connect(this.alice).approve(this.issuance.address, 10000);
      await this.issuance.connect(this.alice).purchaseTicket(10000);
    });
    it("correctly sets new total shares", async function () {
      // supposed vault 1 vault token == 0.5 USDC
      await this.vault.setMintAmount(20000);
      await this.issuance.connect(this.issuanceManager).issue();
      const { totalShares } = await this.issuance.roundData(1);
      expect(totalShares).to.equal(20000);
    });
    it("correctly sets the round stage to end and move to next round", async function () {
      await this.vault.setMintAmount(20000);
      await this.issuance.connect(this.issuanceManager).issue();
      const round = await this.issuance.currentRoundId();
      expect(round).to.equal(2);
      const { stage } = await this.issuance.roundData(1);
      expect(stage).to.equal(Stage.End);
    });
  });
  describe("redeemTicket", function () {
    beforeEach(async function () {
      [this.deployer, this.alice, this.bob, this.issuanceManager] =
        await ethers.getSigners();
      const Issuance = await ethers.getContractFactory("SimpleIssuance");
      const MockToken = await ethers.getContractFactory("LPToken");
      const MockVault = await ethers.getContractFactory("MockXPNVault");
      this.USDC = await MockToken.deploy("USDC", "USDC");
      this.vault = await MockVault.deploy(this.USDC.address);
      this.USDC.deployed();
      this.vault.deployed();
      this.vaultToken = await ethers.getContractAt(
        "LPToken",
        await this.vault.vaultToken()
      );
      const startGoal = 100000;

      this.issuance = await Issuance.deploy(
        this.issuanceManager.address,
        startGoal,
        this.USDC.address,
        this.vaultToken.address,
        this.vault.address
      );
      await this.issuance.deployed();
      this.USDC.mint(this.alice.address, 10000);
      await this.USDC.connect(this.alice).approve(this.issuance.address, 10000);
      await this.issuance.connect(this.alice).purchaseTicket(10000);
      await this.issuance
        .connect(this.issuanceManager)
        .setCurrentRoundGoal(10000);
      await this.vault.setMintAmount(20000);
      await this.issuance.connect(this.issuanceManager).issue();
    });
    it("changes the user ticket to redeemed", async function () {
      await this.issuance.connect(this.alice).redeemTicket(1);
      const { redeemed } = await this.issuance.userTicket(
        1,
        this.alice.address
      );
      expect(redeemed).to.be.true;
    });
    it("can't redeem a ticket that does not exist", async function () {
      const { exists } = await this.issuance.userTicket(1, this.bob.address);
      expect(exists).to.be.false;
      await expect(
        this.issuance.connect(this.bob).redeemTicket(1)
      ).to.be.revertedWith("issuance: user ticket does not exist");
    });
    it("can't redeem a ticket that had already been redeemed", async function () {
      await this.issuance.connect(this.alice).redeemTicket(1);
      const { redeemed } = await this.issuance.userTicket(
        1,
        this.alice.address
      );
      expect(redeemed).to.be.true;
      await expect(
        this.issuance.connect(this.alice).redeemTicket(1)
      ).to.be.revertedWith("issuance: user vault tokens have been redeemed");
    });
  });
  describe("pause", async function () {
    beforeEach(async function () {
      [this.deployer, this.alice, this.bob, this.issuanceManager] =
        await ethers.getSigners();
      const Issuance = await ethers.getContractFactory("SimpleIssuance");
      const MockToken = await ethers.getContractFactory("LPToken");
      const MockVault = await ethers.getContractFactory("MockXPNVault");
      this.USDC = await MockToken.deploy("USDC", "USDC");
      this.vault = await MockVault.deploy(this.USDC.address);
      this.USDC.deployed();
      this.vault.deployed();
      this.vaultToken = await ethers.getContractAt(
        "LPToken",
        await this.vault.vaultToken()
      );
      const startGoal = 100000;

      this.issuance = await Issuance.deploy(
        this.issuanceManager.address,
        startGoal,
        this.USDC.address,
        this.vaultToken.address,
        this.vault.address
      );
      await this.issuance.deployed();
      this.USDC.mint(this.alice.address, 10000);
      await this.USDC.connect(this.alice).approve(this.issuance.address, 10000);
    });
    it("only allow deposit when unpaused", async function () {
      await this.issuance.connect(this.issuanceManager).pause();
      await expect(this.issuance.connect(this.alice).purchaseTicket(10000)).to
        .be.reverted;
      await this.issuance.connect(this.issuanceManager).unpause();
      await this.issuance.connect(this.alice).purchaseTicket(10000);
    });
  });
});
