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

const { expect } = require("chai");
const { bignumToStringArray, bignumToString } = require("./utils/bignum.js");

describe("XPNPortfolio", function () {
  beforeEach(async function () {
    const Signal = await ethers.getContractFactory("XPNSignal");
    this.simpleSignal = await Signal.deploy();
    await this.simpleSignal.deployed();

    const SignalFund = await ethers.getContractFactory("XPNPortfolioSpy");
    let mockAddress = "0x0000000000000000000000000000000000000000";
    this.signalFund = await SignalFund.deploy();
    await this.signalFund.deployed();
    await this.simpleSignal.registerSignal("testSignal1", "Simple", [
      "BTC",
      "ETH",
      "XPN",
    ]);
    this.signalFund.mockSetSignal(this.simpleSignal.address, "testSignal1");
  });

  describe("viewPortfolio DATA", function () {
    it("PortfolioToken", async function () {
      expect(
        bignumToStringArray(await this.signalFund.viewPortfolioToken())
      ).to.deep.equal(["0", "0", "0"]);
      await this.signalFund.setToken(["10", "30", "50"]);
      expect(
        bignumToStringArray(await this.signalFund.viewPortfolioToken())
      ).to.deep.equal(["10", "30", "50"]);
    });
    it("PortfolioMixValue", async function () {
      await this.signalFund.setToken(["25", "50", "50"]);
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
      await this.signalFund.setToken(["25", "50", "50"]);
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
      await this.signalFund.setToken(["25", "50", "50"]);
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
      await this.signalFund.setToken(["0", "0", "1000"]);
      await this.signalFund.setTokensPrice([
        String(4e18),
        String(5e18),
        String(1e18),
      ]);
      await this.simpleSignal.submitSignal(
        "testSignal1",
        ["BTC", "ETH", "XPN"],
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
      await this.signalFund.setToken(["0", "0", "1000"]);
      await this.signalFund.setTokensPrice([
        String(4e18),
        String(5e18),
        String(1e18),
      ]);
      await this.simpleSignal.submitSignal(
        "testSignal1",
        ["BTC", "ETH", "XPN"],
        [1, 1, 0],
        "0x"
      );
      expect(
        bignumToStringArray(await this.signalFund.signalPortfolioDiffValue())
      ).to.deep.equal([String(500), String(500), String(-1000)]);
    });

    it("SignalPortfolioDiffToken", async function () {
      await this.signalFund.setToken(["0", "0", "1000"]);
      await this.signalFund.setTokensPrice([
        String(4e18),
        String(5e18),
        String(1e18),
      ]);
      await this.simpleSignal.submitSignal(
        "testSignal1",
        ["BTC", "ETH", "XPN"],
        [1, 1, 0],
        "0x"
      );
      expect(
        bignumToStringArray(await this.signalFund.signalPortfolioDiffToken())
      ).to.deep.equal([String(125), String(100), String(-1000)]);
    });

    it("SignalPortfolioDiffPercent", async function () {
      await this.signalFund.setToken(["0", "0", "1000"]);
      await this.signalFund.setTokensPrice([
        String(4e18),
        String(5e18),
        String(1e18),
      ]);
      await this.simpleSignal.submitSignal(
        "testSignal1",
        ["BTC", "ETH", "XPN"],
        [1, 1, 0],
        "0x"
      );
      expect(
        bignumToString(await this.signalFund.signalPortfolioDiffPercent())
      ).to.equal(String(1e18));
      await this.simpleSignal.submitSignal(
        "testSignal1",
        ["BTC", "ETH", "XPN"],
        [0, 1, 1],
        "0x"
      );
      expect(
        bignumToString(await this.signalFund.signalPortfolioDiffPercent())
      ).to.equal(String(5e17));
    });
  });
});
