//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.0;

library XPNSignalMath {
    /*
     * assume solidity 0.8.0 over/under flow check
     * will mainly use L1 space aka taxicab geometry
     */

    int256 public constant ONE = 1e18;

    function normalize(int256[] memory x)
        internal
        pure
        returns (int256[] memory out_array)
    {
        out_array = new int256[](x.length);
        int256 size = l1Norm(x);
        if (size == 0) {
            return x;
        }
        for (uint256 i = 0; i < x.length; i++) {
            out_array[i] = (x[i] * ONE) / (size);
        }
    }

    function elementWiseAdd(int256[] memory x, int256[] memory y)
        internal
        pure
        returns (int256[] memory out_array)
    {
        out_array = new int256[](x.length);
        for (uint256 i = 0; i < x.length; i++) {
            out_array[i] = (x[i] + y[i]);
        }
    }

    function elementWiseSub(int256[] memory x, int256[] memory y)
        internal
        pure
        returns (int256[] memory out_array)
    {
        out_array = new int256[](x.length);
        for (uint256 i = 0; i < x.length; i++) {
            out_array[i] = (x[i] - y[i]);
        }
    }

    function elementWiseMul(int256[] memory x, int256[] memory y)
        internal
        pure
        returns (int256[] memory out_array)
    {
        out_array = new int256[](x.length);
        for (uint256 i = 0; i < x.length; i++) {
            out_array[i] = ((x[i] * y[i]) / ONE);
        }
    }

    function elementWiseDiv(int256[] memory x, int256[] memory y)
        internal
        pure
        returns (int256[] memory out_array)
    {
        out_array = new int256[](x.length);
        for (uint256 i = 0; i < x.length; i++) {
            out_array[i] = ((x[i] * ONE) / y[i]);
        }
    }

    function vectorAbs(int256[] memory x)
        internal
        pure
        returns (int256[] memory out_array)
    {
        out_array = new int256[](x.length);
        for (uint256 i = 0; i < x.length; i++) {
            out_array[i] = abs(x[i]);
        }
    }

    function vectorScale(int256[] memory x, int256 scaleFactor)
        internal
        pure
        returns (int256[] memory out_array)
    {
        out_array = new int256[](x.length);
        for (uint256 i = 0; i < x.length; i++) {
            out_array[i] = (x[i] * scaleFactor) / ONE;
        }
    }

    function abs(int256 x) internal pure returns (int256) {
        /* 
            abslute value of input
        */
        return x >= 0 ? x : -x;
    }

    function sum(int256[] memory x) internal pure returns (int256 output) {
        output = 0;
        for (uint256 i = 0; i < x.length; i++) {
            output = output + x[i];
        }
    }

    function l1Norm(int256[] memory x) internal pure returns (int256 output) {
        output = sum(vectorAbs(x));
    }
}
