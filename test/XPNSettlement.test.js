const { expect } = require("chai");
const { kyberTakeOrderArgs } = require("@enzymefinance/protocol");
const { randomAddress } = require("./utils/address.js");

describe("XPNSettlement", function () {
  beforeEach(async function () {
    [this.deployer] = await ethers.getSigners();
    const XPNSettlement = await ethers.getContractFactory("XPNSettlementSpy");
    this.tradesettlement = await XPNSettlement.deploy();
    await this.tradesettlement.deployed();
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
        ...Object.values(this.order).map((arg) =>
          Array.of(...arg, ...arg, ...arg)
        ) // submits 3 trades
      );
      expect(await this.tradesettlement.count()).to.be.equal(3);
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
});
