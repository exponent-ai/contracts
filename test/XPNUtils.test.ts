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
import { randomAddress } from "./utils/address";
const { deployMockContract } = waffle;

describe("XPNUtils", function() {
  before("deploy contract", async function () {
    const Utils = await ethers.getContractFactory("XPNUtils");
    this.utils = await Utils.deploy();
    await this.utils.deployed();
    const utilsCaller = await ethers.getContractFactory("XPNUtilsSpy", {
      libraries: {
        XPNUtils: this.utils.address,
      },
    });
    this.utilsCaller = await utilsCaller.deploy();
    await this.utilsCaller.deployed();
  })

  describe("compare strings", async function () {
    it("returns true if 2 strings are the same", async function () {
      const result = await this.utilsCaller.compareStrings("BTC", "BTC");
      expect(result).to.be.true;
    });
    it("returns false if 2 strings are not the same", async function () {
      const result = await this.utilsCaller.compareStrings("BTC", "ETH");
      expect(result).to.be.false;
    });
  })

  describe("getChainlinkPrice", async function () {
    beforeEach(async function () {
      [this.deployer] = await ethers.getSigners();
      const MockChainlink = await artifacts.readArtifact("AggregatorV3Interface");
      this.chainlink = await deployMockContract(this.deployer, MockChainlink.abi);
    })
    it("should revert if timestamp is 0", async function () {
      await this.chainlink.mock.latestRoundData.returns(0,0,0,0,0);
      await expect(this.utilsCaller.parseChainlinkPrice(this.chainlink.address)).to.be.revertedWith("Chainlink: round is not complete");
    })
    it("should revert if data is stale", async function () {
      await this.chainlink.mock.latestRoundData.returns(2,0,0,1,1);
      await expect(this.utilsCaller.parseChainlinkPrice(this.chainlink.address)).to.be.revertedWith("Chainlink: stale data");
    })
    it("should revert if returned price is zero", async function () {
      await this.chainlink.mock.latestRoundData.returns(1,0,0,1,2);
      await expect(this.utilsCaller.parseChainlinkPrice(this.chainlink.address)).to.be.revertedWith("Chainlink: returned 0");
    })
  });
})
