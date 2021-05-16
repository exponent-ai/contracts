require("dotenv").config();
const { expect } = require("chai");
const { kyberTakeOrderArgs } = require("@enzymefinance/protocol");
const {
  seedBalance,
  initMainnetEnv,
  cleanUp,
  setSnapshot,
} = require("../utils/integration-test-setup.js");

describe("XPNSettlement", function () {
  let contracts;
  before("set up", async function () {
    await setSnapshot();

    [this.signer] = await ethers.getSigners();
    contracts = await initMainnetEnv();
    this.testVault = process.env.TEST_VAULT;
    this.testComptroller = process.env.TEST_COMPTROLLER;

    const Settler = await ethers.getContractFactory("IntXPNVSettlementSpy");
    this.settler = await Settler.deploy(
      process.env.ENZYME_INT_MANAGER,
      this.testComptroller
    );
    const manager = process.env.TEST_MANAGER;

    this.timeout(100000);
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [manager],
    });
    const signer = await ethers.provider.getSigner(manager);

    await contracts.ENZYME_INT_MANAGER.connect(signer).addAuthUserForFund(
      this.testComptroller,
      this.settler.address
    );

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [manager],
    });
    this.tradeAmount = "1804000000";
    hre.tracer.nameTags[this.settler.address] = "Settler";
    hre.tracer.nameTags[this.signer.address] = "new manager";
    hre.tracer.nameTags[this.testVault] = "test-vault";
    hre.tracer.nameTags[this.testComptroller] = "test-comptroller";
    hre.tracer.nameTags[contracts.WETH.address] = "WETH";
    hre.tracer.nameTags[contracts.USDC.address] = "USDC";
    hre.tracer.nameTags[process.env.KYBER_ADDRESS] = "KyberAdapter";
    hre.tracer.nameTags["0x7C66550C9c730B6fdd4C03bc2e73c5462c5F7ACC"] =
      "KyberNetwork";
    hre.tracer.nameTags["0xeB74c8B319515593a26DaB10a13F19872C2Ecb02"] =
      "KyberFprReserveV2";
  });
  it("can submit a trade", async function () {
    this.timeout(100000);
    const prewethbal = await contracts.WETH.balanceOf(this.testVault);
    const preusdcbal = await contracts.USDC.balanceOf(this.testVault);
    const kyberArgs = kyberTakeOrderArgs({
      incomingAsset: contracts.USDC.address,
      minIncomingAssetAmount: this.tradeAmount,
      outgoingAsset: contracts.WETH.address,
      outgoingAssetAmount: ethers.utils.parseEther("1"),
    });
    const kyberVenue = process.env.KYBER_ADDRESS;
    await this.settler.submitTradeOrders(
      Array.of(kyberArgs),
      Array.of(kyberVenue)
    );
    const postwethbal = await contracts.WETH.balanceOf(this.testVault);
    const postusdcbal = await contracts.USDC.balanceOf(this.testVault);
    expect(prewethbal).to.be.above(postwethbal);
    expect(preusdcbal).to.be.below(postusdcbal);
  });
  it("can submit batched trades", async function () {
    this.timeout(100000);
    const prewethbal = await contracts.WETH.balanceOf(this.testVault);
    const preusdcbal = await contracts.USDC.balanceOf(this.testVault);
    const kyberArgs = kyberTakeOrderArgs({
      incomingAsset: contracts.USDC.address,
      minIncomingAssetAmount: this.tradeAmount,
      outgoingAsset: contracts.WETH.address,
      outgoingAssetAmount: ethers.utils.parseEther("1"),
    });
    const kyberVenue = process.env.KYBER_ADDRESS;
    await this.settler.submitTradeOrders(
      Array.of(kyberArgs, kyberArgs),
      Array.of(kyberVenue, kyberVenue)
    );
    const postwethbal = await contracts.WETH.balanceOf(this.testVault);
    const postusdcbal = await contracts.USDC.balanceOf(this.testVault);
    expect(prewethbal).to.be.above(postwethbal);
    expect(preusdcbal).to.be.below(postusdcbal);
  });
});
