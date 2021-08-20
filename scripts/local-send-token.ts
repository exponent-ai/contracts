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
import {
  seedBalance,
  initMainnetEnv,
} from "../test/utils/integration-test-setup";

async function main() {
  console.log("transfering ETH to: ")
  const [contracts] = await initMainnetEnv();
  if (!process.env.npm_config_to) {
    console.error("to address not specified");
  }
  if (!process.env.npm_config_amount) {
    console.error("amount not specified");
  }
  if (!process.env.npm_config_token) {
    console.error("amount not specified");
  }
  let ticker;
  let tokenContract;
  let decimals;
  switch (process.env.npm_config_token) {
    case "WETH":
      ticker = "WETH";
      tokenContract = contracts.WETH;
      decimals = await contracts.WETH.decimals();
    case "USDC":
      ticker = "USDC";
      tokenContract = contracts.USDC;
      decimals = await contracts.USDC.decimals();
    default:
      console.error("token ticker not supported");
  }
  const tx = {
    ticker: ticker,
    contract: tokenContract,
    to: process.env.npm_config_to,
    amount: ethers.utils.parseUnits(
      process.env.npm_config_amount as string,
      decimals
    ),
  }

  await seedBalance(tx);
  console.log(process.env.npm_config_token, " Transfer Successful")
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
