const { expect } = require("chai");
const { bignumToStringArray, bignumToString } = require("./utils/bignum.js");
const { randomAddress } = require("./utils/address.js");

describe("XPNPortfolio", function () {
  describe("hapyy case", function () {
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
      let mockAddress = "0x0000000000000000000000000000000000000000";
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

    describe("viewPortfolio DATA", function () {
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
    this.overflowIfAdded =
      "55792089237316195423570985008687907853269984665640564039457584007913129639935";
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
      let mockAddress = "0x0000000000000000000000000000000000000000";
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
        let mockAddress = "0x0000000000000000000000000000000000000000";
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

      it("viewPortfolioToken work normally", async function () {
        expect(
          bignumToStringArray(await this.signalFund.viewPortfolioToken())
        ).to.deep.equal(["0", "0", "0"]);
      });

      it("viewPortfolioMixValue work normally", async function () {
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
        let mockAddress = "0x0000000000000000000000000000000000000000";
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
          [
            "55792089237316195423570985008687907853269984665640564039457584007913129639935",
            "55792089237316195423570985008687907853269984665640564039457584007913129639935",
            "55792089237316195423570985008687907853269984665640564039457584007913129639935",
          ],
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
      it("viewPortfolioToken work normally", async function () {
        expect(
          bignumToStringArray(await this.signalFund.viewPortfolioToken())
        ).to.deep.equal(["10", "10", "10"]);
      });

      it("viewPortfolioMixValue work normally", async function () {
        expect(
          bignumToStringArray(await this.signalFund.viewPortfolioMixValue())
        ).to.deep.equal(["10", "10", "10"]);
      });

      it("revert on SignalPortfolioDiffPercent", async function () {
        await expect(this.signalFund.signalPortfolioDiffPercent()).to.be
          .reverted;
      });
      it("viewPortfolioAllocation work normally", async function () {
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
        let mockAddress = "0x0000000000000000000000000000000000000000";
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

        await this.tokenA.mintTo(
          this.vaultAddress,
          "55792089237316195423570985008687907853269984665640564039457584007913129639935"
        );
        await this.tokenB.mintTo(
          this.vaultAddress,
          "55792089237316195423570985008687907853269984665640564039457584007913129639935"
        );
        await this.tokenC.mintTo(
          this.vaultAddress,
          "55792089237316195423570985008687907853269984665640564039457584007913129639935"
        );
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
