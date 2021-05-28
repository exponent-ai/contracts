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

    it("portfolioValue", async function () {
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
    it("signalPortfolioDiffValue", async function () {
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

    it("signalPortfolioDiffToken", async function () {
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

    it("signalPortfolioDiffPercent", async function () {
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
