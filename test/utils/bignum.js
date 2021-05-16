function bignumToString(bignum) {
  return ethers.BigNumber.from(bignum).toString();
}

function bignumToStringArray(bignums) {
  return bignums.map(function (e) {
    return bignumToString(e);
  });
}

module.exports = {
  bignumToString,
  bignumToStringArray,
};
