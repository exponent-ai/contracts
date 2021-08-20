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
import * as fs from "fs";
import { kyberTakeOrderArgs } from "@enzymefinance/protocol";
import {
  seedBalance,
  initMainnetEnv,
} from "../test/utils/integration-test-setup";
import { randomAddress } from "../test/utils/address";
import { Role, grantRole} from "../src/role";
import { addAsset } from "../src/addAsset";
import { SignalService, defaultSignal } from "../src/signal";
import { feeConfig, deployerArgs } from "../src/deployer";


async function main() {
  const [admin, settler, whitelister, bob] = await ethers.getSigners();
  const [ contracts ] = await initMainnetEnv();

  const kyberVenue = contracts.KYBER.address;
  const usdcAddress = contracts.USDC.address;
  const wethAddress = contracts.WETH.address;
  const usdcETHFeed = contracts.ORACLE_USDC_ETH.address;
  const btcAddress = contracts.WBTC.address;
  const btcETHFeed = contracts.ORACLE_WBTC_ETH.address;

  // Seed balances
  await seedBalance({
    ticker: "WETH",
    contract: contracts.WETH,
    to: admin.address,
    amount: "100000000000000000000",
  });
  await seedBalance({
    ticker: "USDC",
    contract: contracts.USDC,
    to: admin.address,
    amount: "100000000",
  });
  await seedBalance({
    ticker: "WETH",
    contract: contracts.WETH,
    to: bob.address,
    amount: "100000000000000000000",
  });
  await seedBalance({
    ticker: "USDC",
    contract: contracts.USDC,
    to: bob.address,
    amount: "100000000",
  });
  console.log("Admin and Bob account seeded with WETH and USDC.");
  console.log("Admin: ", admin.address);
  console.log("Bob: ", bob.address);

  // Deploy Signal
  const Signal = await ethers.getContractFactory("XPNSignal");
  const simpleSignal = await Signal.deploy();
  await simpleSignal.deployed();
  console.log("XPNSignal deployed to:", simpleSignal.address);

  // Deploy XPNUtils
  const Util = await ethers.getContractFactory("XPNUtils");
  const util = await Util.deploy();
  await util.deployed();
  console.log("XPNUtils deployed to:", util.address);

  const feeManagerConfigData = feeConfig({
    managementFeePercent: "0.015",
    managementFeeAddress: contracts.ENZYME_MANAGEMENT_FEE.address,
    performanceFeePercent: "0.1",
    performanceFeeAddress: contracts.ENZYME_PERFORMANCE_FEE.address,
  });

  const enzymeContracts = {
	  deployer: contracts.ENZYME_DEPLOYER.address,
    integrationManager: contracts.ENZYME_INT_MANAGER.address,
    trackedAssetAdapter: contracts.ENZYME_ASSET_ADAPTER.address,
    policyManager: contracts.ENZYME_POLICY_MANAGER.address,
    whitelistPolicy: contracts.ENZYME_INVESTOR_WHITELIST.address,
  }

  const constructorArgs = deployerArgs({
    enzyme: enzymeContracts,
    admin: admin.address,
    settler: settler.address,
    signal: simpleSignal.address,
    denomAsset: contracts.WETH.address,
    denomSymbol: "WETH",
    tokenSymbol: "EX-ETH",
    feeConfig: feeManagerConfigData,
  });

  // Deploy Main
  const Main = await ethers.getContractFactory("XPNMain", {
    libraries: {
      XPNUtils: util.address,
    },
  });
  const main = await Main.deploy(constructorArgs, "EX-ETH", "EX-ETH");
  await main.deployed();
  console.log("XPNMain deployed to:", main.address);

  // Create signals
  await simpleSignal.registerSignal("testsignal", "Simple", [
    "WETH",
    "BTC",
    "USDC",
  ]);
  await simpleSignal.submitSignal(
    "testsignal",
    ["WETH", "BTC", "USDC"],
    [1, 0, 1],
    "0x"
  );
  console.log("Signal created");

  await grantRole({
    grantor: main.connect(admin),
    role: Role.AssetWhitelister,
    grantee: whitelister.address
  });

  await addAsset({
    contract: main.connect(whitelister),
    asset: contracts.WBTC.address,
    feed: contracts.ORACLE_WBTC_ETH.address,
    symbol: "BTC"
  });

  await addAsset({
    contract: main.connect(whitelister),
    asset: contracts.USDC.address,
    feed: contracts.ORACLE_USDC_ETH.address,
    symbol: "USDC"
  });

  await addAsset({
    contract: main.connect(whitelister),
    asset: contracts.WETH.address,
    feed: contracts.WETH.address, // contract will ignore denomasset feed
    symbol: "WETH"
  });
  console.log("Assets whitelisted");

  await main.swapSignal(simpleSignal.address, "testsignal");
  console.log("Signal set");

  await main.connect(admin).initializeFundConfig();
  console.log("Initialized fund config");

  // Whitelist venue
  await grantRole({
    grantor: main.connect(admin),
    role: Role.VenueWhitelister,
    grantee: whitelister.address
  });
  await main.connect(whitelister).whitelistVenue(kyberVenue);
  console.log("Kyber venue whitelisted");

  // Initial vault deposit
  const depositAmount = ethers.utils.parseUnits("5", 18);
  await contracts.WETH.connect(admin).approve(main.address, depositAmount);
  console.log("Admin approved for initial deposit");
  await main.connect(admin).deposit(depositAmount);
  console.log("Admin has made the vaults first deposit");

  // Submit trade
  const tradeAmount = "3608000000";
  const kyberArgs = kyberTakeOrderArgs({
    incomingAsset: contracts.USDC.address,
    minIncomingAssetAmount: tradeAmount,
    outgoingAsset: contracts.WETH.address,
    outgoingAssetAmount: ethers.utils.parseEther("2"),
  });
  await main
    .connect(settler)
    .submitTradeOrders(Array.of(kyberArgs), Array.of(kyberVenue));
  console.log("Trade submitted to Kyber");
  const localState = {
    admin: admin.address,
    bob: bob.address,
    settler: settler.address,
    whitelister: whitelister.address,
    xpnSignal: simpleSignal.address,
    xpnUtil: util.address,
    xpnMain: main.address,
  };

  let localStateJson = JSON.stringify(localState);
  fs.writeFileSync('./cache/localstate.json', localStateJson);
  console.log("Local state successfully persisted");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
