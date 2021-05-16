require("dotenv").config();
const { expect } = require("chai");
const {
  seedBalance,
  initMainnetEnv,
  cleanUp,
  setSnapshot,
} = require("../utils/integration-test-setup.js");

describe("integration test setup", function () {
  after("clean up", async function () {
    const { WETH } = await initMainnetEnv();
    const [deployer] = await ethers.getSigners();
    await cleanUp({ tokens: [WETH], users: [deployer] });
  });

  it("setSnapshot", async function () {
    await setSnapshot();
    expect(await ethers.provider.getBlockNumber()).to.be.equal(
      parseInt(process.env.BLOCK_NUMBER)
    );
  });

  it("initMainnetEnv", async function () {
    const { USDC, WETH } = await initMainnetEnv();
    expect(await WETH.symbol()).to.be.equal("WETH");
    expect(await USDC.symbol()).to.be.equal("USDC");
  });

  it("seedBalance", async function () {
    const { WETH } = await initMainnetEnv();
    const [deployer] = await ethers.getSigners();
    await seedBalance({
      ticker: "WETH",
      contract: WETH,
      to: deployer.address,
      amount: 10000000,
    });
    expect(await WETH.balanceOf(deployer.address)).to.be.equal(10000000);
  });
});
