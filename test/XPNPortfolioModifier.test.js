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
const { padZeros } = require("./utils/bignum");

describe("XPNPortfolioModifier", function () {
  describe("ensureTrade", async function () {
    beforeEach(async function () {
      const Portfolio = await ethers.getContractFactory(
        "XPNPortfolioModifierSpy"
      );
      this.portfolio = await Portfolio.deploy(); // submit transaction....
      await this.portfolio.deployed(); // check that contract deployed
    });

    it("should not revert if distance > 0 and value loss less than expected", async function () {
      const portValue = padZeros("1000", 18); // 1000
      const diffPercent = padZeros("5", 16); // 5%
      const newPortValue = padZeros("9999", 17); //999.9
      const newDiffPercent = padZeros("1", 16); // 1%
      await this.portfolio.set_portfolioValue(portValue);
      await this.portfolio._set_signalPortfolioDiffPercent(diffPercent);
      await this.portfolio.settleTrade(newPortValue, newDiffPercent);
    });
    it("should revert if distance improved less than zero", async function () {
      const portValue = padZeros("1000", 18); // 1000
      const diffPercent = padZeros("5", 16); // 5%
      const newPortValue = padZeros("9999", 17); //999.9
      const newDiffPercent = padZeros("6", 16); // 6%
      await this.portfolio.set_portfolioValue(portValue);
      await this.portfolio._set_signalPortfolioDiffPercent(diffPercent);
      await expect(
        this.portfolio.settleTrade(newPortValue, newDiffPercent)
      ).to.be.revertedWith("trade requirement not satisfy");
    });

    it("should revert if value loss more than expected", async function () {
      const portValue = padZeros("1000", 18); // 1000
      const diffPercent = padZeros("5", 16); // 5%
      const newPortValue = padZeros("950", 18); //950
      const newDiffPercent = padZeros("1", 16); // 1%
      await this.portfolio.set_portfolioValue(portValue);
      await this.portfolio._set_signalPortfolioDiffPercent(diffPercent);
      await expect(
        this.portfolio.settleTrade(newPortValue, newDiffPercent)
      ).to.be.revertedWith("trade requirement not satisfy");
    });

    it("should revert if value loss more than expected and distance improved less than zero", async function () {
      const portValue = padZeros("1000", 18); // 1000
      const diffPercent = padZeros("5", 16); // 5%
      const newPortValue = padZeros("950", 18); //950.9
      const newDiffPercent = padZeros("6", 16); // 6%
      await this.portfolio.set_portfolioValue(portValue);
      await this.portfolio._set_signalPortfolioDiffPercent(diffPercent);
      await expect(
        this.portfolio.settleTrade(newPortValue, newDiffPercent)
      ).to.be.revertedWith("trade requirement not satisfy");
    });
  });
});
