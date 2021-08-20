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
import { MAX_INT, bignumToStringArray, bignumToString } from "./utils/bignum";

describe("XPNPortfolio", function () {
  describe("happy case", function () {
    beforeEach(async function () {
      const Signal = await ethers.getContractFactory("XPNSignal");
      this.simpleSignal = await Signal.deploy();
      await this.simpleSignal.deployed();

      const MockToken = await ethers.getContractFactory("MockERC20");
      this.tokenA = await MockToken.deploy("TOKEN A", "TOA");
      await this.tokenA.deployed();
      this.tokenB = await MockToken.deploy("TOKEN B", "TOB");
      await this.tokenB.deployed();
      this.tokenC = await MockToken.deploy("TOKEN B", "TOC");
      await this.tokenC.deployed();

      const SignalFund = await ethers.getContractFactory("XPNPortfolioSpy");
      this.signalFund = await SignalFund.deploy();
      await this.signalFund.deployed();
      await this.simpleSignal.registerSignal("testSignal1", "Simple", [
        "TOA",
        "TOB",
        "TOC",
      ]);
      await this.simpleSignal.submitSignal(
        "testSignal1",
        ["TOA", "TOB", "TOC"],
        [1, 1, 0],
        "0x"
      );

      this.signalFund.callSetSignal(this.simpleSignal.address, "testSignal1");
      await this.signalFund.setSymbolToToken("TOA", this.tokenA.address);
      await this.signalFund.setSymbolToToken("TOB", this.tokenB.address);
      await this.signalFund.setSymbolToToken("TOC", this.tokenC.address);
      this.vaultAddress = randomAddress();
      await this.signalFund.setVaultAddress(this.vaultAddress);
    });

    describe("viewPortfolio data", function () {
      it("PortfolioToken", async function () {
        expect(
          bignumToStringArray(await this.signalFund.viewPortfolioToken())
        ).to.deep.equal(["0", "0", "0"]);
        await this.tokenA.mintTo(this.vaultAddress, 10);
        await this.tokenB.mintTo(this.vaultAddress, 30);
        await this.tokenC.mintTo(this.vaultAddress, 50);

        expect(
          bignumToStringArray(await this.signalFund.viewPortfolioToken())
        ).to.deep.equal(["10", "30", "50"]);
      });
      it("PortfolioMixValue", async function () {
        await this.tokenA.mintTo(this.vaultAddress, 25);
        await this.tokenB.mintTo(this.vaultAddress, 50);
        await this.tokenC.mintTo(this.vaultAddress, 50);
        await this.signalFund.setTokensPrice([
          String(4e18),
          String(3e18),
          String(5e18),
        ]);
        expect(
          bignumToStringArray(await this.signalFund.viewPortfolioMixValue())
        ).to.deep.equal(["100", "150", "250"]);
      });
      it("PortfolioAllocation", async function () {
        await this.tokenA.mintTo(this.vaultAddress, 25);
        await this.tokenB.mintTo(this.vaultAddress, 50);
        await this.tokenC.mintTo(this.vaultAddress, 50);
        await this.signalFund.setTokensPrice([
          String(4e18),
          String(3e18),
          String(5e18),
        ]);
        expect(
          bignumToStringArray(await this.signalFund.viewPortfolioAllocation())
        ).to.deep.equal([String(2e17), String(3e17), String(5e17)]);
      });

      it("PortfolioValue", async function () {
        await this.tokenA.mintTo(this.vaultAddress, 25);
        await this.tokenB.mintTo(this.vaultAddress, 50);
        await this.tokenC.mintTo(this.vaultAddress, 50);
        await this.signalFund.setTokensPrice([
          String(4e18),
          String(3e18),
          String(5e18),
        ]);
        expect(bignumToString(await this.signalFund.portfolioValue())).to.equal(
          String(500)
        );
      });
    });

    describe("call diff between signal and portfilio", function () {
      it("signalPortfolioDiffAllovcation", async function () {
        await this.tokenA.mintTo(this.vaultAddress, 0);
        await this.tokenB.mintTo(this.vaultAddress, 0);
        await this.tokenC.mintTo(this.vaultAddress, 1000);
        await this.signalFund.setTokensPrice([
          String(4e18),
          String(5e18),
          String(1e18),
        ]);
        await this.simpleSignal.submitSignal(
          "testSignal1",
          ["TOA", "TOB", "TOC"],
          [1, 1, 0],
          "0x"
        );
        expect(
          bignumToStringArray(await this.signalFund.viewPortfolioAllocation())
        ).to.deep.equal([String(0), String(0), String(1e18)]);
        expect(
          bignumToStringArray(
            await this.signalFund.signalPortfolioDiffAllocation()
          )
        ).to.deep.equal([String(5e17), String(5e17), String(-1e18)]);
      });
      it("SignalPortfolioDiffValue", async function () {
        await this.tokenA.mintTo(this.vaultAddress, 0);
        await this.tokenB.mintTo(this.vaultAddress, 0);
        await this.tokenC.mintTo(this.vaultAddress, 1000);
        await this.signalFund.setTokensPrice([
          String(4e18),
          String(5e18),
          String(1e18),
        ]);
        await this.simpleSignal.submitSignal(
          "testSignal1",
          ["TOA", "TOB", "TOC"],
          [1, 1, 0],
          "0x"
        );
        expect(
          bignumToStringArray(await this.signalFund.signalPortfolioDiffValue())
        ).to.deep.equal([String(500), String(500), String(-1000)]);
      });

      it("SignalPortfolioDiffToken", async function () {
        await this.tokenA.mintTo(this.vaultAddress, 0);
        await this.tokenB.mintTo(this.vaultAddress, 0);
        await this.tokenC.mintTo(this.vaultAddress, 1000);
        await this.signalFund.setTokensPrice([
          String(4e18),
          String(5e18),
          String(1e18),
        ]);
        await this.simpleSignal.submitSignal(
          "testSignal1",
          ["TOA", "TOB", "TOC"],
          [1, 1, 0],
          "0x"
        );
        expect(
          bignumToStringArray(await this.signalFund.signalPortfolioDiffToken())
        ).to.deep.equal([String(125), String(100), String(-1000)]);
      });

      it("SignalPortfolioDiffPercent", async function () {
        await this.tokenA.mintTo(this.vaultAddress, 0);
        await this.tokenB.mintTo(this.vaultAddress, 0);
        await this.tokenC.mintTo(this.vaultAddress, 1000);
        await this.signalFund.setTokensPrice([
          String(4e18),
          String(5e18),
          String(1e18),
        ]);
        await this.simpleSignal.submitSignal(
          "testSignal1",
          ["TOA", "TOB", "TOC"],
          [1, 1, 0],
          "0x"
        );
        expect(
          bignumToString(await this.signalFund.signalPortfolioDiffPercent())
        ).to.equal(String(1e18));
        await this.simpleSignal.submitSignal(
          "testSignal1",
          ["TOA", "TOB", "TOC"],
          [0, 1, 1],
          "0x"
        );
        expect(
          bignumToString(await this.signalFund.signalPortfolioDiffPercent())
        ).to.equal(String(5e17));
      });
    });
  });
  describe("edge case", function () {
    // passing this.reallyBigInt256 to some function will cause some error.
    // for now: just use raw string - TODO: fix it
    beforeEach(async function () {
      const Signal = await ethers.getContractFactory("XPNSignal");
      this.simpleSignal = await Signal.deploy();
      await this.simpleSignal.deployed();

      const MockToken = await ethers.getContractFactory("MockERC20");
      this.tokenA = await MockToken.deploy("TOKEN A", "TOA");
      await this.tokenA.deployed();
      this.tokenB = await MockToken.deploy("TOKEN B", "TOB");
      await this.tokenB.deployed();
      this.tokenC = await MockToken.deploy("TOKEN B", "TOC");
      await this.tokenC.deployed();

      const SignalFund = await ethers.getContractFactory("XPNPortfolioSpy");
      this.signalFund = await SignalFund.deploy();
      await this.signalFund.deployed();
      await this.simpleSignal.registerSignal("testSignal1", "Simple", [
        "TOA",
        "TOB",
        "TOC",
      ]);
      await this.simpleSignal.submitSignal(
        "testSignal1",
        ["TOA", "TOB", "TOC"],
        [1, 1, 0],
        "0x"
      );

      this.signalFund.callSetSignal(this.simpleSignal.address, "testSignal1");
      await this.signalFund.setSymbolToToken("TOA", this.tokenA.address);
      await this.signalFund.setSymbolToToken("TOB", this.tokenB.address);
      await this.signalFund.setSymbolToToken("TOC", this.tokenC.address);
      this.vaultAddress = randomAddress();
      await this.signalFund.setVaultAddress(this.vaultAddress);
    });

    describe("on empty vault", async function () {
      before("set up test", async function () {
        // Nothing in da vault

        const Signal = await ethers.getContractFactory("XPNSignal");
        this.simpleSignal = await Signal.deploy();
        await this.simpleSignal.deployed();

        const MockToken = await ethers.getContractFactory("MockERC20");
        this.tokenA = await MockToken.deploy("TOKEN A", "TOA");
        await this.tokenA.deployed();
        this.tokenB = await MockToken.deploy("TOKEN B", "TOB");
        await this.tokenB.deployed();
        this.tokenC = await MockToken.deploy("TOKEN B", "TOC");
        await this.tokenC.deployed();

        const SignalFund = await ethers.getContractFactory("XPNPortfolioSpy");
        this.signalFund = await SignalFund.deploy();
        await this.signalFund.deployed();
        await this.simpleSignal.registerSignal("testSignal1", "Simple", [
          "TOA",
          "TOB",
          "TOC",
        ]);
        await this.simpleSignal.submitSignal(
          "testSignal1",
          ["TOA", "TOB", "TOC"],
          [1, 1, 0],
          "0x"
        );

        this.signalFund.callSetSignal(this.simpleSignal.address, "testSignal1");
        await this.signalFund.setSymbolToToken("TOA", this.tokenA.address);
        await this.signalFund.setSymbolToToken("TOB", this.tokenB.address);
        await this.signalFund.setSymbolToToken("TOC", this.tokenC.address);
        this.vaultAddress = randomAddress();
        await this.signalFund.setVaultAddress(this.vaultAddress);
      });

      it("viewPortfolioToken works normally", async function () {
        expect(
          bignumToStringArray(await this.signalFund.viewPortfolioToken())
        ).to.deep.equal(["0", "0", "0"]);
      });

      it("viewPortfolioMixValue works normally", async function () {
        expect(
          bignumToStringArray(await this.signalFund.viewPortfolioMixValue())
        ).to.deep.equal(["0", "0", "0"]);
      });

      it("revert on SignalPortfolioDiffPercent", async function () {
        await expect(this.signalFund.signalPortfolioDiffPercent()).to.be
          .reverted;
      });
      it("revert on viewPortfolioAllocation", async function () {
        await expect(this.signalFund.viewPortfolioAllocation()).to.be.reverted;
      });

      it("revert on signalPortfolioDiffAllocation", async function () {
        await expect(this.signalFund.signalPortfolioDiffAllocation()).to.be
          .reverted;
      });
      it("revert on signalPortfolioDiffValue", async function () {
        await expect(this.signalFund.signalPortfolioDiffValue()).to.be.reverted;
      });

      it("revert on signalPortfolioDiffToken", async function () {
        await expect(this.signalFund.signalPortfolioDiffToken()).to.be.reverted;
      });
    });

    describe("on signal overflow", async function () {
      before("set up test", async function () {
        // sum of signal is over max int
        // 3 token 10 each all token price = 1e18

        const Signal = await ethers.getContractFactory("XPNSignal");
        this.simpleSignal = await Signal.deploy();
        await this.simpleSignal.deployed();

        const MockToken = await ethers.getContractFactory("MockERC20");
        this.tokenA = await MockToken.deploy("TOKEN A", "TOA");
        await this.tokenA.deployed();
        this.tokenB = await MockToken.deploy("TOKEN B", "TOB");
        await this.tokenB.deployed();
        this.tokenC = await MockToken.deploy("TOKEN B", "TOC");
        await this.tokenC.deployed();

        const SignalFund = await ethers.getContractFactory("XPNPortfolioSpy");
        this.signalFund = await SignalFund.deploy();
        await this.signalFund.deployed();
        await this.simpleSignal.registerSignal("testSignal1", "Simple", [
          "TOA",
          "TOB",
          "TOC",
        ]);
        await this.simpleSignal.submitSignal(
          "testSignal1",
          ["TOA", "TOB", "TOC"],
          [MAX_INT, MAX_INT, MAX_INT],
          "0x"
        );

        this.signalFund.callSetSignal(this.simpleSignal.address, "testSignal1");
        await this.signalFund.setSymbolToToken("TOA", this.tokenA.address);
        await this.signalFund.setSymbolToToken("TOB", this.tokenB.address);
        await this.signalFund.setSymbolToToken("TOC", this.tokenC.address);
        this.vaultAddress = randomAddress();
        await this.signalFund.setVaultAddress(this.vaultAddress);

        await this.tokenA.mintTo(this.vaultAddress, 10);
        await this.tokenB.mintTo(this.vaultAddress, 10);
        await this.tokenC.mintTo(this.vaultAddress, 10);
        await this.signalFund.setTokensPrice([
          String(1e18),
          String(1e18),
          String(1e18),
        ]);
      });
      it("viewPortfolioToken works normally", async function () {
        expect(
          bignumToStringArray(await this.signalFund.viewPortfolioToken())
        ).to.deep.equal(["10", "10", "10"]);
      });

      it("viewPortfolioMixValue works normally", async function () {
        expect(
          bignumToStringArray(await this.signalFund.viewPortfolioMixValue())
        ).to.deep.equal(["10", "10", "10"]);
      });

      it("revert on SignalPortfolioDiffPercent", async function () {
        await expect(this.signalFund.signalPortfolioDiffPercent()).to.be
          .reverted;
      });
      it("viewPortfolioAllocation works normally", async function () {
        expect(
          bignumToStringArray(await this.signalFund.viewPortfolioAllocation())
        ).to.deep.equal([
          "333333333333333333",
          "333333333333333333",
          "333333333333333333",
        ]);
      });

      it("revert on signalPortfolioDiffAllocation", async function () {
        await expect(this.signalFund.signalPortfolioDiffAllocation()).to.be
          .reverted;
      });
      it("revert on signalPortfolioDiffValue", async function () {
        await expect(this.signalFund.signalPortfolioDiffValue()).to.be.reverted;
      });

      it("revert on signalPortfolioDiffToken", async function () {
        await expect(this.signalFund.signalPortfolioDiffToken()).to.be.reverted;
      });
    });

    describe("on vault overflow", async function () {
      before("set up test", async function () {
        // sum of signal is over max int
        // 3 token 10 each all token price = 1e18

        const Signal = await ethers.getContractFactory("XPNSignal");
        this.simpleSignal = await Signal.deploy();
        await this.simpleSignal.deployed();

        const MockToken = await ethers.getContractFactory("MockERC20");
        this.tokenA = await MockToken.deploy("TOKEN A", "TOA");
        await this.tokenA.deployed();
        this.tokenB = await MockToken.deploy("TOKEN B", "TOB");
        await this.tokenB.deployed();
        this.tokenC = await MockToken.deploy("TOKEN B", "TOC");
        await this.tokenC.deployed();

        const SignalFund = await ethers.getContractFactory("XPNPortfolioSpy");
        this.signalFund = await SignalFund.deploy();
        await this.signalFund.deployed();
        await this.simpleSignal.registerSignal("testSignal1", "Simple", [
          "TOA",
          "TOB",
          "TOC",
        ]);
        await this.simpleSignal.submitSignal(
          "testSignal1",
          ["TOA", "TOB", "TOC"],
          ["1", "1", "1"],
          "0x"
        );

        this.signalFund.callSetSignal(this.simpleSignal.address, "testSignal1");
        await this.signalFund.setSymbolToToken("TOA", this.tokenA.address);
        await this.signalFund.setSymbolToToken("TOB", this.tokenB.address);
        await this.signalFund.setSymbolToToken("TOC", this.tokenC.address);
        this.vaultAddress = randomAddress();
        await this.signalFund.setVaultAddress(this.vaultAddress);

        await this.tokenA.mintTo(this.vaultAddress, MAX_INT);
        await this.tokenB.mintTo(this.vaultAddress, MAX_INT);
        await this.tokenC.mintTo(this.vaultAddress, MAX_INT);
        await this.signalFund.setTokensPrice([
          String(1e18),
          String(1e18),
          String(1e18),
        ]);
      });
      it("revert on viewPortfolioToken", async function () {
        await expect(this.signalFund.viewPortfolioToken()).to.be.reverted;
      });

      it("revert on viewPortfolioMixValue", async function () {
        await expect(this.signalFund.viewPortfolioMixValue()).to.be.reverted;
      });

      it("revert on SignalPortfolioDiffPercent", async function () {
        await expect(this.signalFund.signalPortfolioDiffPercent()).to.be
          .reverted;
      });
      it("revert on viewPortfolioAllocation", async function () {
        await expect(this.signalFund.viewPortfolioAllocation()).to.be.reverted;
      });

      it("revert on signalPortfolioDiffAllocation", async function () {
        await expect(this.signalFund.signalPortfolioDiffAllocation()).to.be
          .reverted;
      });
      it("revert on signalPortfolioDiffValue", async function () {
        await expect(this.signalFund.signalPortfolioDiffValue()).to.be.reverted;
      });

      it("revert on signalPortfolioDiffToken", async function () {
        await expect(this.signalFund.signalPortfolioDiffToken()).to.be.reverted;
      });
    });
  });
});
