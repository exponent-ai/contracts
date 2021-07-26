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

const MAX_INT =
  "55792089237316195423570985008687907853269984665640564039457584007913129639935";

module.exports = {
  bignumToString,
  bignumToStringArray,
  padZeros,
  MAX_INT,
};
