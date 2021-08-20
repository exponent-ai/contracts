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

import { ethers } from "hardhat";
import { expect } from "chai";
import {
  kyberTakeOrderArgs,
  aaveLendArgs,
  aaveRedeemArgs,
} from "@enzymefinance/protocol";
import { randomAddress } from "./utils/address";

describe("XPNSettlement", function () {
  beforeEach(async function () {
    [this.deployer] = await ethers.getSigners();
    const XPNSettlement = await ethers.getContractFactory("XPNSettlementSpy");
    this.tradesettlement = await XPNSettlement.deploy();
    await this.tradesettlement.deployed();
    this.mockVenue = randomAddress();
    this.mockToken = randomAddress();
  });
  describe("submitTradeOrders", function () {
    beforeEach(async function () {
      const MockToken = await ethers.getContractFactory("MockERC20");
      this.dai = await MockToken.deploy("DAI token", "DAI");
      await this.dai.deployed();
      this.weth = await MockToken.deploy("Wrapped ETH", "weth");
      await this.weth.deployed();
      let venue = randomAddress();
      const kyberArgs = kyberTakeOrderArgs({
        incomingAsset: this.weth.address,
        minIncomingAssetAmount: "1804000000",
        outgoingAsset: this.dai.address,
        outgoingAssetAmount: ethers.utils.parseEther("1"),
      });
      this.order = {
        trades: Array.of(kyberArgs),
        venues: Array.of(venue),
      };
    });
    it("should reject if number of inputs vary", async function () {
      this.order.venues = [...this.order.venues, ...this.order.venues];
      await expect(
        this.tradesettlement.submitTradeOrders(...Object.values(this.order))
      ).to.be.revertedWith(
        "TradeSettlement: trade submissions input length not equal"
      );
    });
    it("should reject if venue is not whitelisted", async function () {
      await this.tradesettlement.setIsWhitelist(false);
      await this.tradesettlement.setReturnMsg(true);
      await expect(
        this.tradesettlement.submitTradeOrders(...Object.values(this.order))
      ).to.be.revertedWith("XPNSettlement: venue is not whitelisted");
    });
    it("should reject if submitTrade returns false", async function () {
      await this.tradesettlement.setIsWhitelist(true);
      await this.tradesettlement.setReturnMsg(false);
      await expect(
        this.tradesettlement.submitTradeOrders(...Object.values(this.order))
      ).to.be.revertedWith("XPNSettlement: a trade did not execute");
    });
    it("should call a correct number of transactions", async function () {
      await this.tradesettlement.setIsWhitelist(true);
      await this.tradesettlement.setReturnMsg(true);
      await this.tradesettlement.submitTradeOrders(
        ...Object.values(this.order).map((arg: any) =>
          Array.of(...arg, ...arg, ...arg)
        ) // submits 3 trades
      );
      expect(await this.tradesettlement.tradecount()).to.be.equal(3);
    });
    it("should emit an event on successful trade", async function () {
      await this.tradesettlement.setIsWhitelist(true);
      await this.tradesettlement.setReturnMsg(true);
      await expect(
        this.tradesettlement.submitTradeOrders(...Object.values(this.order))
      )
        .to.emit(this.tradesettlement, "SubmitTradeOrders")
        .withArgs(this.deployer.address, this.order.trades, this.order.venues);
    });
  });
  describe("submitPoolOrders", function () {
    it("should reject if orders input length not equal", async function () {
      const lendArgs = aaveLendArgs({
        aToken: this.mockToken,
        amount: 1000,
      });
      await expect(
        this.tradesettlement.submitPoolOrders(
          Array.of(lendArgs),
          Array.of(0, 1), // wrong number of arguments
          Array.of(this.mockVenue)
        )
      ).to.be.revertedWith(
        "TradeSettlement: pool submissions input length not equal"
      );
    });

    it("should reject if a venue is not whitelisted", async function () {
      await this.tradesettlement.setIsWhitelist(false);
      const lendArgs = aaveLendArgs({
        aToken: this.mockToken,
        amount: 1000,
      });
      await expect(
        this.tradesettlement.submitPoolOrders(
          Array.of(lendArgs),
          Array.of(0),
          Array.of(this.mockVenue)
        )
      ).to.be.revertedWith("XPNSettlement: venue is not whitelisted");
    });

    it("should reject if implementation returned false", async function () {
      await this.tradesettlement.setIsWhitelist(true);
      await this.tradesettlement.setReturnMsg(false);
      const lendArgs = aaveLendArgs({
        aToken: this.mockToken,
        amount: 1000,
      });
      await expect(
        this.tradesettlement.submitPoolOrders(
          Array.of(lendArgs),
          Array.of(0),
          Array.of(this.mockVenue)
        )
      ).to.be.revertedWith("XPNSettlement: a trade did not execute");
    });

    it("should emit a Lend event on successful lend transaction", async function () {
      await this.tradesettlement.setIsWhitelist(true);
      await this.tradesettlement.setReturnMsg(true);
      const lendArgs = aaveLendArgs({
        aToken: this.mockToken,
        amount: 1000,
      });
      await expect(
        this.tradesettlement.submitPoolOrders(
          Array.of(lendArgs),
          Array.of(0),
          Array.of(this.mockVenue)
        )
      ).to.emit(this.tradesettlement, "Lend");
    });

    it("should emit a Redeem event on successful redeem transaction", async function () {
      await this.tradesettlement.setIsWhitelist(true);
      await this.tradesettlement.setReturnMsg(true);
      const lendArgs = aaveLendArgs({
        aToken: this.mockToken,
        amount: 1000,
      });
      await expect(
        this.tradesettlement.submitPoolOrders(
          Array.of(lendArgs),
          Array.of(1),
          Array.of(this.mockVenue)
        )
      ).to.emit(this.tradesettlement, "Redeem");
    });
  });
});
