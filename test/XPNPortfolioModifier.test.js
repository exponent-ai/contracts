const { expect } = require("chai");
const { padZeros } = require("./utils/bignum");

describe("XPNPortfolioModifier", function () {
  describe("ensureTrade", async function () {
    beforeEach(async function () {


      const Portfolio = await ethers.getContractFactory("XPNPortfolioModifierSpy")
      this.portfolio = await Portfolio.deploy(); // submit transaction....
      await this.portfolio.deployed(); // check that contract deployed
      this.startingPortValue = padZeros("1000", 18); // 1000
      this.startingDiffPercent = padZeros("5", 16); // 5%
      this.acceptablePortValue = padZeros("9999", 17); //999.9
      this.highLossPortValue = padZeros("950", 18); //950
      this.improvedDistance = padZeros("1", 16); // 1%
      this.notImprovedDistance = padZeros("6", 16); // 6%
    });

    it("should not revert if distance > 0 and value loss less than expected", async function () {
      await this.portfolio.set_portfolioValue(this.startingPortValue);
      await this.portfolio._set_signalPortfolioDiffPercent(
        this.startingDiffPercent
      );

      await this.portfolio.settleTrade(
        this.acceptablePortValue,
        this.improvedDistance
      );
    });
    it("should revert if distance improved less than zero", async function () {
      await this.portfolio.set_portfolioValue(this.startingPortValue);
      await this.portfolio._set_signalPortfolioDiffPercent(
        this.startingDiffPercent
      );
      await expect(
        this.portfolio.settleTrade(
          this.acceptablePortValue,
          this.notImprovedDistance
        )
      ).to.be.revertedWith("trade requirement not satisfy");
    });

    it("should revert if value loss more than expected", async function () {
      await this.portfolio.set_portfolioValue(this.startingPortValue);
      await this.portfolio._set_signalPortfolioDiffPercent(
        this.startingDiffPercent
      );
      await expect(
        this.portfolio.settleTrade(
          this.highLossPortValue,
          this.improvedDistance
        )
      ).to.be.revertedWith("trade requirement not satisfy");
    });

    it("should revert if value loss more than expected and distance improved less than zero", async function () {
      await this.portfolio.set_portfolioValue(this.startingPortValue);
      await this.portfolio._set_signalPortfolioDiffPercent(
        this.startingDiffPercent
      );
      await expect(
        this.portfolio.settleTrade(
          this.highLossPortValue,
          this.notImprovedDistance
        )
      ).to.be.revertedWith("trade requirement not satisfy");
    });
  });
});
