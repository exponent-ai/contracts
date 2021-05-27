async function main() {

  const [depositor, admin] = await ethers.getSigners();

  console.log(
    "Deploying contracts with the account:",
    depositor.address
  );
  console.log("Account balance:", (await depositor.getBalance()).toString());

  // XPNSignalMath
  const SignalMath = await ethers.getContractFactory("XPNSignalMath");
  signalMath = await SignalMath.deploy();
  console.log("XPNSignalMath deployed to:", signalMath.address);

  // XPNSettlement
  const XPNSettlement = await ethers.getContractFactory("XPNSettlement");
  tradesettlement = await XPNSettlement.deploy();
  console.log("XPNSettlement deployed to:", tradesettlement.address);

  // TODO: Change this for and underlying asset address
  const MockToken = await ethers.getContractFactory("MockERC20");
  token = await MockToken.deploy("DAI token", "DAI");

  // XPNVault
  const Vault = await ethers.getContractFactory("XPNVault");
  vault = await Vault.deploy(
    token.address,
    "Exponent DAI LP Token",
    "EXLP-DAI"
  );
  console.log("XPNVault deployed to:", vault.address);

  // XPNSignalCore
  const Util = await ethers.getContractFactory("XPNUtils");
  util = await Util.deploy();
  const SignalFund = await ethers.getContractFactory("XPNSignalCore", {
    libraries: {
      XPNUtils: util.address,
    },
  });
  // TODO: Change thsese for and underlying asset address
  let mockAddress = "0x0000000000000000000000000000000000000000";
  const assetAddresses = [
    {name: "BTC", address: mockAddress, priceFeed: mockAddress},
    {name: "ETH", address: mockAddress, priceFeed: mockAddress},
    {name: "USDT", address: mockAddress, priceFeed: mockAddress},
  ]
  signalFund = await SignalFund.deploy(
    vault.address,
    assetAddresses.map(x => x.name),
    assetAddresses.map(x => x.address),
    assetAddresses.map(x => x.priceFeed)
  );
  console.log("XPNSignalCore deployed to:", signalFund.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
