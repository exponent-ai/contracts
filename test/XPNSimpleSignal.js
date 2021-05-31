const { expect } = require("chai");
const { bignumToStringArray, bignumToString } = require("./utils/bignum.js");

describe("Basic Signal", function () {
  beforeEach(async function () {
    this.signer1 = await ethers.getSigner(0);
    this.signer2 = await ethers.getSigner(1);

    const Signal = await ethers.getContractFactory("XPNSignal");
    this.simpleSignal = await Signal.deploy();
    await this.simpleSignal.deployed();
  });

  describe("register signal", function () {
    it("can regiester a signal", async function () {
      await this.simpleSignal
        .connect(this.signer1)
        .registerSignal("testsignal1", "Simple", ["BTC", "ETH", "XPN"]);
    });
    it("can regiester a few different signal", async function () {
      await this.simpleSignal
        .connect(this.signer1)
        .registerSignal("testsignal1", "Simple", ["BTC", "ETH", "XPN"]);
      await this.simpleSignal
        .connect(this.signer1)
        .registerSignal("testsignal2", "Simple", ["BTC", "ETH", "XPN"]);
      await this.simpleSignal
        .connect(this.signer2)
        .registerSignal("testsignal3", "Simple", ["BTC", "ETH", "XPN"]);
      await this.simpleSignal
        .connect(this.signer2)
        .registerSignal("testsignal4", "Simple", ["BTC", "ETH", "XPN"]);
    });

    it("can't register signal with the same name", async function () {
      await this.simpleSignal
        .connect(this.signer1)
        .registerSignal("testsignal1", "Simple", ["BTC", "ETH", "XPN"]);
      await expect(
        this.simpleSignal
          .connect(this.signer1)
          .registerSignal("testsignal1", "Simple", ["BTC", "ETH", "XPN"])
      ).to.be.reverted;
    });
  });

  describe("Submit signal", function () {
    it("Can submit to registered signal", async function () {
      await this.simpleSignal
        .connect(this.signer1)
        .registerSignal("testsignal1", "Simple", ["BTC", "ETH", "XPN"]);
      await this.simpleSignal
        .connect(this.signer1)
        .submitSignal("testsignal1", ["BTC", "ETH", "USDT"], [1, 2, 1], "0x");
    });

    it("Can't submit to unregistered signal ", async function () {
      await expect(
        this.simpleSignal
          .connect(this.signer1)
          .submitSignal("testsignal1", ["BTC", "ETH", "USDT"], [1, 2, 1], "0x")
      ).to.be.reverted;
    });
  });

  describe("get signal", function () {
    it("others user can get currect signal data", async function () {
      await this.simpleSignal
        .connect(this.signer1)
        .registerSignal("testsignal1", "Simple", ["BTC", "ETH", "XPN"]);
      await this.simpleSignal
        .connect(this.signer1)
        .submitSignal("testsignal1", ["BTC", "ETH", "USDT"], [1, 2, 1], "0x");
      expect(
        bignumToStringArray(
          await this.simpleSignal.connect(this.signer2).getSignal("testsignal1")
        )
      ).to.be.deep.equal(["1", "2", "1"]);
    });
    it("revert if signal not exist", async function () {
      await expect(
        this.simpleSignal.connect(this.signer1).getSignal("ARandomName")
      ).to.be.reverted;
    });
  });

  describe("withdraw signal", function () {
    it("owner withdraw signal if exist", async function () {
      await this.simpleSignal
        .connect(this.signer1)
        .registerSignal("testsignal1", "Simple", ["BTC", "ETH", "XPN"]);
      await this.simpleSignal
        .connect(this.signer1)
        .submitSignal("testsignal1", ["BTC", "ETH", "USDT"], [1, 2, 1], "0x");
      await this.simpleSignal
        .connect(this.signer1)
        .withdrawSignal("testsignal1");
    });

    it("non-owner can't withdraw signal if exist", async function () {
      await this.simpleSignal
        .connect(this.signer1)
        .registerSignal("testSingal1", "Simple", ["BTC", "ETH", "XPN"]);
      await this.simpleSignal
        .connect(this.signer1)
        .submitSignal("testSingal1", ["BTC", "ETH", "USDT"], [1, 2, 1], "0x");
      await expect(
        this.simpleSignal.connect(this.signer2).withdrawSignal("testSingal1")
      ).to.be.reverted;
    });

    it("can't get data from withdrawed signal", async function () {
      await this.simpleSignal
        .connect(this.signer1)
        .registerSignal("testSingal1", "Simple", ["BTC", "ETH", "XPN"]);
      await this.simpleSignal
        .connect(this.signer1)
        .submitSignal("testSingal1", ["BTC", "ETH", "USDT"], [1, 2, 1], "0x");
      await this.simpleSignal.connect(this.signer2).getSignal("testSingal1");
      await this.simpleSignal
        .connect(this.signer1)
        .withdrawSignal("testSingal1");
      await expect(
        this.simpleSignal.connect(this.signer2).getSignal("testSingal1")
      ).to.be.reverted;
    });
  });
});
