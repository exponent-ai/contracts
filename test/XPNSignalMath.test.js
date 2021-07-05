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
const { bignumToStringArray } = require("./utils/bignum.js");

describe("SignalMath", function () {
  beforeEach(async function () {
    [this.depositor] = await ethers.getSigners();
    const TestSignalMath = await ethers.getContractFactory("XPNSignalMathSpy");
    this.testSignalMath = await TestSignalMath.deploy();
    await this.testSignalMath.deployed();
    this.ONE = 1e18;
    this.withdrawAmount = 10000;
  });

  describe("abs", function () {
    it("do abs", async function () {
      expect(await this.testSignalMath.callAbs(-5)).equal(5);
      expect(await this.testSignalMath.callAbs(5)).equal(5);
    });
  });

  describe("normalize", function () {
    it("normalize 2 number", async function () {
      let normalized = await this.testSignalMath.callNnormalize([1, 1]);
      let bignums = bignumToStringArray(normalized);
      expect(bignums).to.deep.equal([
        "500000000000000000",
        "500000000000000000",
      ]);
    });

    it("normalize a few number", async function () {
      let normalized = await this.testSignalMath.callNnormalize([1, 1, 2]);
      let bignums = bignumToStringArray(normalized);
      expect(bignums).to.deep.equal([
        "250000000000000000",
        "250000000000000000",
        "500000000000000000",
      ]);
    });

    it("normalize mixed of positive and negative number", async function () {
      let normalized = await this.testSignalMath.callNnormalize([1, -1]);
      let bignums = bignumToStringArray(normalized);
      expect(bignums).to.deep.equal([
        "500000000000000000",
        "-500000000000000000",
      ]);
    });
    it("normalize 0 vector", async function () {
      let normalized = await this.testSignalMath.callNnormalize([0, 0]);
      let bignums = bignumToStringArray(normalized);
      expect(bignums).to.deep.equal(["0", "0"]);
    });
  });

  describe("ElementWiseAdd", function () {
    it("add each element", async function () {
      expect(
        bignumToStringArray(
          await this.testSignalMath.callElementWiseAdd([1, 2], [3, 4])
        )
      ).deep.equal(["4", "6"]);
      expect(
        bignumToStringArray(
          await this.testSignalMath.callElementWiseAdd([1, 2], [-3, 4])
        )
      ).deep.equal(["-2", "6"]);
    });
  });

  describe("ElementWiseSub", function () {
    it("sub each element", async function () {
      expect(
        bignumToStringArray(
          await this.testSignalMath.callElementWiseSub([1, 2], [3, 4])
        )
      ).deep.equal(["-2", "-2"]);
      expect(
        bignumToStringArray(
          await this.testSignalMath.callElementWiseSub([1, 2], [-3, 4])
        )
      ).deep.equal(["4", "-2"]);
    });
  });

  describe("ElementWiseMul", function () {
    it("mul each element", async function () {
      expect(
        bignumToStringArray(
          await this.testSignalMath.callElementWiseMul(
            [1, 2],
            ["3000000000000000000", "4000000000000000000"]
          )
        )
      ).deep.equal(["3", "8"]);
      expect(
        bignumToStringArray(
          await this.testSignalMath.callElementWiseMul(
            [1, 2],
            ["-3000000000000000000", "4000000000000000000"]
          )
        )
      ).deep.equal(["-3", "8"]);
    });
  });

  describe("ElementWiseDiv", function () {
    it("div each element", async function () {
      expect(
        bignumToStringArray(
          await this.testSignalMath.callElementWiseDiv(
            [60, 60],
            ["3000000000000000000", "4000000000000000000"]
          )
        )
      ).deep.equal(["20", "15"]);
      expect(
        bignumToStringArray(
          await this.testSignalMath.callElementWiseDiv(
            [10, 20],
            ["-3000000000000000000", "4000000000000000000"]
          )
        )
      ).deep.equal(["-3", "5"]);
    });
  });

  describe("VectorAbs", function () {
    it("abs  each element", async function () {
      expect(
        bignumToStringArray(await this.testSignalMath.callVectorAbs([-5, 6]))
      ).deep.equal(["5", "6"]);
      expect(
        bignumToStringArray(await this.testSignalMath.callVectorAbs([1, 0]))
      ).deep.equal(["1", "0"]);
    });
  });

  describe("VectorScale", function () {
    it("scale each element", async function () {
      expect(
        bignumToStringArray(
          await this.testSignalMath.callVectorScale(
            [-5, 6],
            "2000000000000000000"
          )
        )
      ).deep.equal(["-10", "12"]);
      expect(
        bignumToStringArray(
          await this.testSignalMath.callVectorScale(
            [-5, 6],
            "500000000000000000"
          )
        )
      ).deep.equal(["-2", "3"]);
      expect(
        bignumToStringArray(
          await this.testSignalMath.callVectorScale(
            [-50, 60],
            "500000000000000000"
          )
        )
      ).deep.equal(["-25", "30"]);
    });
  });

  describe("VectorSum", function () {
    it("sum each element", async function () {
      expect(await this.testSignalMath.callSum([1, 2, 3])).equal(6);
      expect(await this.testSignalMath.callSum([1, -2, 3])).equal(2);
      expect(await this.testSignalMath.callSum([-1, -2, -3])).equal(-6);
    });
  });

  describe("L1 norm", function () {
    it("L1 norm", async function () {
      expect(await this.testSignalMath.callL1Norm([1, 2, 3])).equal(6);
      expect(await this.testSignalMath.callL1Norm([1, -2, 3])).equal(6);
      expect(await this.testSignalMath.callL1Norm([-1, -2, -3])).equal(6);
    });
  });
});
