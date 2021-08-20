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

import * as fs from "fs";
import { ethers } from "hardhat";

async function main() {
  const state = fs.readFileSync('./cache/localstate.json');
  const stateJson = JSON.parse(state.toString());
  console.log("Contracts and Roles")
  Object.entries(stateJson).map(([key, value], index) => {
    console.log(`${key}: ${value}`);
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
