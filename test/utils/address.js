function randomAddress() {
  const address = ethers.utils.hexlify(ethers.utils.randomBytes(20));
  return ethers.utils.getAddress(address);
}

module.exports = { randomAddress };
