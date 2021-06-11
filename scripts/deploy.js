const path = require("path");
require("dotenv").config({
  path: path.resolve(process.cwd(), ".integration.env"),
});

async function main() {
  const [depositor] = await ethers.getSigners();

  console.log(`Deploying contracts with the account: ${depositor.address}`);
  console.log("Account balance:", (await depositor.getBalance()).toString());

  // Deploy XPNUtils
  const Util = await ethers.getContractFactory("XPNUtils");
  this.util = await Util.deploy();
  await this.util.deployed();
  console.log("XPNUtils deployed to:", this.util.address);

  // Deploy Signal
  const Signal = await ethers.getContractFactory("XPNSignal");
  this.simpleSignal = await Signal.deploy();
  await this.simpleSignal.deployed();
  console.log("XPNSignal deployed to:", this.simpleSignal.address);

  const constructorArgs = [
    process.env.ADMIN_ADDRESS,
    process.env.SETTLER_ADDRESS,
    this.simpleSignal.address, // signal address
    process.env.DENOM_ASSET_SYMBOL,
    process.env.ENZYME_DEPLOYER,
    process.env.ENZYME_INT_MANAGER,
    process.env.ENZYME_ASSET_ADAPTER,
    process.env.ENZYME_POLICY_MANAGER, // policy manager
    process.env.ENZYME_INVESTOR_WHITELIST, // investor whitelist
    ethers.constants.AddressZero,
    ethers.constants.AddressZero,
    [],
    process.env.VAULT_NAME,
  ];

  const Core = await ethers.getContractFactory("XPNMain", {
    libraries: {
      XPNUtils: this.util.address,
    },
  });
  this.core = await Core.deploy(
    constructorArgs,
    process.env.DENOM_ASSET_ADDRESS,
    process.env.TOKEN_NAME,
    process.env.TOKEN_SYMBOL
  );
  await this.core.deployed();
  console.log("XPNCore deployed to:", this.simpleSignal.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
