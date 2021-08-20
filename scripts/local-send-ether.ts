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

async function main() {
  console.log("transfering ETH to: ")
  const [sender]  = await ethers.getSigners();
  if (!process.env.npm_config_to) {
    console.error("to address not specified");
  }
  if (!process.env.npm_config_amount) {
    console.error("amount not specified");
  }
  const recipient = process.env.npm_config_to;
  const tx = {
    to: recipient,
    value: ethers.utils.parseEther(process.env.npm_config_amount as string),
  }
  const transaction = await sender.sendTransaction(tx)
  console.log(transaction)
  console.log("ETH transfer successful")
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
