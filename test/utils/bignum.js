function bignumToString(bignum) {
  return ethers.BigNumber.from(bignum).toString();
}

function bignumToStringArray(bignums) {
  return bignums.map(function (e) {
    return bignumToString(e);
  });
}

function padZeros(number, NZero) {
  return number + "0".repeat(NZero);
}

module.exports = {
  bignumToString,
  bignumToStringArray,
  padZeros,
};
