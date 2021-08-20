import * as dotenv from "dotenv";
import { ethers } from "hardhat";
import { expect } from "chai";
import {
  seedBalance,
  initMainnetEnv,
  cleanUp,
  setSnapshot,
} from "../utils/integration-test-setup";

dotenv.config();

describe("integration test setup", function () {
  after("clean up", async function () {
    const [{ WETH }] = await initMainnetEnv();
    const [deployer] = await ethers.getSigners();
    await cleanUp({ tokens: [WETH], users: [deployer] });
  });

  it("setSnapshot", async function () {
    await setSnapshot();
    expect(await ethers.provider.getBlockNumber()).to.be.equal(
      parseInt(process.env.BLOCK_NUMBER as string)
    );
  });

  it("initMainnetEnv", async function () {
    const [{ WETH, USDC }] = await initMainnetEnv();
    expect(await WETH.symbol()).to.be.equal("WETH");
    expect(await USDC.symbol()).to.be.equal("USDC");
  });

  it("seedBalance", async function () {
    const [{ WETH }] = await initMainnetEnv();
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
