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

describe("Basic Signal", function () {
  beforeEach(async function () {
    this.signer1 = await ethers.getSigner(0);
    this.signer2 = await ethers.getSigner(1);

    const Signal = await ethers.getContractFactory("XPNSignal");
    this.simpleSignal = await Signal.deploy();
    await this.simpleSignal.deployed();
  });

  describe("register signal", function () {
    it("can register a signal", async function () {
      await this.simpleSignal
        .connect(this.signer1)
        .registerSignal("testsignal1", "Simple", ["BTC", "ETH", "XPN"]);
    });
    it("can register a few different signals", async function () {
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

    it("can't register a signal with the same name", async function () {
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
    it("other users can get correct signal data", async function () {
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
    it("revert if signal does not exist", async function () {
      await expect(
        this.simpleSignal.connect(this.signer1).getSignal("ARandomName")
      ).to.be.reverted;
    });
  });

  describe("withdraw signal", function () {
    it("owner can withdraw signal if exists", async function () {
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

    it("non-owner can't withdraw signal if exists", async function () {
      await this.simpleSignal
        .connect(this.signer1)
        .registerSignal("testSignal1", "Simple", ["BTC", "ETH", "XPN"]);
      await this.simpleSignal
        .connect(this.signer1)
        .submitSignal("testSignal1", ["BTC", "ETH", "USDT"], [1, 2, 1], "0x");
      await expect(
        this.simpleSignal.connect(this.signer2).withdrawSignal("testSignal1")
      ).to.be.reverted;
    });

    it("can't get data from withdrawn signal", async function () {
      await this.simpleSignal
        .connect(this.signer1)
        .registerSignal("testSignal1", "Simple", ["BTC", "ETH", "XPN"]);
      await this.simpleSignal
        .connect(this.signer1)
        .submitSignal("testSignal1", ["BTC", "ETH", "USDT"], [1, 2, 1], "0x");
      await this.simpleSignal.connect(this.signer2).getSignal("testSignal1");
      await this.simpleSignal
        .connect(this.signer1)
        .withdrawSignal("testSignal1");
      await expect(
        this.simpleSignal.connect(this.signer2).getSignal("testSignal1")
      ).to.be.reverted;
    });
  });
});
