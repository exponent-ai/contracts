//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.0;

import "../XPNSignalMath.sol";

contract XPNSignalMathSpy {
    function callNnormalize(int256[] memory x)
        public
        pure
        returns (int256[] memory out_array)
    {
        return XPNSignalMath.normalize(x);
    }

    function callAbs(int256 x) public pure returns (int256) {
        return XPNSignalMath.abs(x);
    }

    function callElementWiseAdd(int256[] memory x, int256[] memory y)
        public
        pure
        returns (int256[] memory out_array)
    {
        return XPNSignalMath.elementWiseAdd(x, y);
    }

    function callElementWiseSub(int256[] memory x, int256[] memory y)
        public
        pure
        returns (int256[] memory out_array)
    {
        return XPNSignalMath.elementWiseSub(x, y);
    }

    function callElementWiseMul(int256[] memory x, int256[] memory y)
        public
        pure
        returns (int256[] memory out_array)
    {
        return XPNSignalMath.elementWiseMul(x, y);
    }

    function callElementWiseDiv(int256[] memory x, int256[] memory y)
        public
        pure
        returns (int256[] memory out_array)
    {
        return XPNSignalMath.elementWiseDiv(x, y);
    }

    function callVectorAbs(int256[] memory x)
        public
        pure
        returns (int256[] memory out_array)
    {
        return XPNSignalMath.vectorAbs(x);
    }

    function callVectorScale(int256[] memory x, int256 scaleFactor)
        public
        pure
        returns (int256[] memory out_array)
    {
        return XPNSignalMath.vectorScale(x, scaleFactor);
    }

    function callSum(int256[] memory x) public pure returns (int256 output) {
        return XPNSignalMath.sum(x);
    }

    function callL1Norm(int256[] memory x) public pure returns (int256 output) {
        return XPNSignalMath.l1Norm(x);
    }
}
