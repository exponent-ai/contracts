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
  // TODO: find a way to set up signal in CD
  const Signal = await ethers.getContractFactory("XPNSignal");
  this.simpleSignal = await Signal.deploy();
  await this.simpleSignal.deployed();
  console.log("XPNSignal deployed to:", this.simpleSignal.address);

  // TODO: Change signal name
  process.stdout.write("Registering Signal");
  await this.simpleSignal.registerSignal("testsignal1", "Simple", ["ETH"]);
  console.log("DONE");
  process.stdout.write("Submitting signal: ");
  await this.simpleSignal.submitSignal("testsignal1", ["ETH"], [1], "0x");
  console.log("DONE");

  const contracts = {
    ENZYME_DEPLOYER: {
      address: "0x8375F0423C1DE0D8aCDCa79224F3d47fE8E6E197",
    },
    ENZYME_INT_MANAGER: {
      address: "0x81198c4b6954CbA32d7aCE52580bd7a1265DEa3f",
    },
    ENZYME_ASSET_ADAPTER: {
      address: "0x837d050F4a9eed50E32dAc9571Cf22F064514891",
    },
    ENZYME_POLICY_MANAGER: {
      address: "0x49FA9A194D0fC7bbD8f350AF2206975EDB7E2c3b",
    },
    ENZYME_INVESTOR_WHITELIST: {
      address: "0x9A300Ab621B41B7b8dC16775Ca1FDc9AB569C1B8",
    },
    WETH: {
      address: "0xd0a1e359811322d97991e03f863a0c30c2cf029c",
    },
  };

  const constructorArgs = [
    process.env.ADMIN_ADDRESS || "0x0dD215270c8981c32240A9634951e84aF18C2765",
    process.env.SETTLER_ADDRESS || "0x0dD215270c8981c32240A9634951e84aF18C2765",
    this.simpleSignal.address, // signal address
    "ETH",
    contracts.ENZYME_DEPLOYER.address,
    contracts.ENZYME_INT_MANAGER.address,
    contracts.ENZYME_ASSET_ADAPTER.address,
    contracts.ENZYME_POLICY_MANAGER.address, // policy manager
    contracts.ENZYME_INVESTOR_WHITELIST.address, // investor whitelist
    ethers.constants.AddressZero,
    ethers.constants.AddressZero,
    [],
    "EX-ETH",
  ];

  const Core = await ethers.getContractFactory("XPNMain", {
    libraries: {
      XPNUtils: this.util.address,
    },
  });
  this.core = await Core.deploy(
    constructorArgs,
    contracts.WETH.address,
    "EX-ETH",
    "EX-ETH"
  );
  await this.core.deployed();
  console.log("XPNCore deployed to:", this.simpleSignal.address);
  process.stdout.write("Setting up signal: ");
  await this.core.setSignal(this.simpleSignal.address, "testsignal1");
  console.log("DONE");
  process.stdout.write("Initializing XPNMain: ");
  await this.core.initializeFundConfig();
  console.log("DONE");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
