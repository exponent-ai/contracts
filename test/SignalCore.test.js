const { expect } = require("chai");
const { bignumToStringArray, bignumToString } = require("./utils/bignum.js");

describe("SignalCore", function () {
  beforeEach(async function () {
    this.signal1 = await ethers.getSigner(0);
    this.signal2 = await ethers.getSigner(1);

    const Util = await ethers.getContractFactory("XPNUtils");
    this.util = await Util.deploy();
    await this.util.deployed();

    const SignalFund = await ethers.getContractFactory("MockSignalFund", {
      libraries: {
        XPNUtils: this.util.address,
      },
    });
    let mockAddress = "0x0000000000000000000000000000000000000000";
    this.signalFund = await SignalFund.deploy(
      mockAddress,
      ["BTC", "ETH", "USDT"],
      [mockAddress, mockAddress, mockAddress],
      [mockAddress, mockAddress, mockAddress]
    );
    await this.signalFund.deployed();
  });

  describe("Submit signal", function () {
    it("Submit single signal", async function () {
      await this.signalFund
        .connect(this.signal1)
        .submitSignal(["BTC", "ETH", "USDT"], [1, 2, 1]);
      expect(
        bignumToStringArray(
          await this.signalFund.connect(this.signal1).getUserSignal()
        )
      ).deep.equal([String(25e16), String(50e16), String(25e16)]);
      expect(
        bignumToStringArray(await this.signalFund.getMasterSignal())
      ).deep.equal([String(25e16), String(50e16), String(25e16)]);
    });

    it("Submit aggreegate signal", async function () {
      await this.signalFund
        .connect(this.signal1)
        .submitSignal(["BTC", "ETH", "USDT"], [2, 2, 0]);
      await this.signalFund
        .connect(this.signal2)
        .submitSignal(["BTC", "ETH", "USDT"], [0, 2, 2]);
      expect(
        bignumToStringArray(await this.signalFund.getMasterSignal())
      ).deep.equal([String(25e16), String(50e16), String(25e16)]);
    });
  });

  describe("withdraw signal", function () {
    it("withdraw signal", async function () {
      await this.signalFund
        .connect(this.signal1)
        .submitSignal(["BTC", "ETH", "USDT"], [2, 2, 0]);
      expect(
        bignumToStringArray(
          await this.signalFund.connect(this.signal1).getUserSignal()
        )
      ).deep.equal(["500000000000000000", "500000000000000000", "0"]);
      await this.signalFund.connect(this.signal1).withdrawSignal();
      expect(
        bignumToStringArray(await this.signalFund.getMasterSignal())
      ).deep.equal(["0", "0", "0"]);
      expect(
        bignumToStringArray(
          await this.signalFund.connect(this.signal1).getUserSignal()
        )
      ).deep.equal(["0", "0", "0"]);
    });
  });

  describe("viewPortfolio DATA", function () {
    it("PortfolioToken", async function () {
      expect(
        bignumToStringArray(await this.signalFund._viewPortfolioToken())
      ).to.deep.equal(["0", "0", "0"]);
      await this.signalFund.mockDeposit(2, 50);
      await this.signalFund.mockDeposit(0, 10);
      await this.signalFund.mockDeposit(1, 30);
      expect(
        bignumToStringArray(await this.signalFund._viewPortfolioToken())
      ).to.deep.equal(["10", "30", "50"]);
    });
    it("PortfolioMixValue", async function () {
      await this.signalFund.mockDeposit(0, 25);
      await this.signalFund.mockDeposit(1, 50);
      await this.signalFund.mockDeposit(2, 50);
      await this.signalFund.setTokensPrice([
        String(4e18),
        String(3e18),
        String(5e18),
      ]);
      expect(
        bignumToStringArray(await this.signalFund._viewPortfolioMixValue())
      ).to.deep.equal(["100", "150", "250"]);
    });
    it("PortfolioAllocation", async function () {
      await this.signalFund.mockDeposit(0, 25);
      await this.signalFund.mockDeposit(1, 50);
      await this.signalFund.mockDeposit(2, 50);
      await this.signalFund.setTokensPrice([
        String(4e18),
        String(3e18),
        String(5e18),
      ]);
      expect(
        bignumToStringArray(await this.signalFund._viewPortfolioAllocation())
      ).to.deep.equal([String(2e17), String(3e17), String(5e17)]);
    });

    it("_portfolioValue", async function () {
      await this.signalFund.mockDeposit(0, 25);
      await this.signalFund.mockDeposit(1, 50);
      await this.signalFund.mockDeposit(2, 50);
      await this.signalFund.setTokensPrice([
        String(4e18),
        String(3e18),
        String(5e18),
      ]);
      expect(bignumToString(await this.signalFund._portfolioValue())).to.equal(
        String(500)
      );
    });
  });

  describe("call diff between signal and portfilio", function () {
    it("signalPortfolioDiffAllovcation", async function () {
      await this.signalFund.mockDeposit(0, 0);
      await this.signalFund.mockDeposit(1, 0);
      await this.signalFund.mockDeposit(2, 1000);
      await this.signalFund.setTokensPrice([
        String(4e18),
        String(5e18),
        String(1e18),
      ]);
      await this.signalFund
        .connect(this.signal1)
        .submitSignal(["BTC", "ETH", "USDT"], [1, 1, 0]);
      expect(
        bignumToStringArray(await this.signalFund.getMasterSignal())
      ).deep.equal([String(5e17), String(5e17), String(0)]);
      expect(
        bignumToStringArray(await this.signalFund._viewPortfolioAllocation())
      ).to.deep.equal([String(0), String(0), String(1e18)]);
      expect(
        bignumToStringArray(
          await this.signalFund.signalPortfolioDiffAllovcation()
        )
      ).to.deep.equal([String(5e17), String(5e17), String(-1e18)]);
    });
    it("_signalPortfolioDiffValue", async function () {
      await this.signalFund.mockDeposit(0, 0);
      await this.signalFund.mockDeposit(1, 0);
      await this.signalFund.mockDeposit(2, 1000);
      await this.signalFund.setTokensPrice([
        String(4e18),
        String(5e18),
        String(1e18),
      ]);
      await this.signalFund
        .connect(this.signal1)
        .submitSignal(["BTC", "ETH", "USDT"], [1, 1, 0]);
      expect(
        bignumToStringArray(await this.signalFund._signalPortfolioDiffValue())
      ).to.deep.equal([String(500), String(500), String(-1000)]);
    });

    it("_signalPortfolioDiffToken", async function () {
      await this.signalFund.mockDeposit(0, 0);
      await this.signalFund.mockDeposit(1, 0);
      await this.signalFund.mockDeposit(2, 1000);
      await this.signalFund.setTokensPrice([
        String(4e18),
        String(5e18),
        String(1e18),
      ]);
      await this.signalFund
        .connect(this.signal1)
        .submitSignal(["BTC", "ETH", "USDT"], [1, 1, 0]);
      expect(
        bignumToStringArray(await this.signalFund._signalPortfolioDiffToken())
      ).to.deep.equal([String(125), String(100), String(-1000)]);
    });

    it("_signalPortfolioDiffPercent", async function () {
      await this.signalFund.mockDeposit(0, 0);
      await this.signalFund.mockDeposit(1, 0);
      await this.signalFund.mockDeposit(2, 1000);
      await this.signalFund.setTokensPrice([
        String(4e18),
        String(5e18),
        String(1e18),
      ]);
      await this.signalFund
        .connect(this.signal1)
        .submitSignal(["BTC", "ETH", "USDT"], [1, 1, 0]);
      expect(
        bignumToString(await this.signalFund._signalPortfolioDiffPercent())
      ).to.equal(String(1e18));
      await this.signalFund
        .connect(this.signal1)
        .submitSignal(["BTC", "ETH", "USDT"], [0, 1, 1]);
      expect(
        bignumToString(await this.signalFund._signalPortfolioDiffPercent())
      ).to.equal(String(5e17));
    });
  });
});
