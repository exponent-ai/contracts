//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.0;

interface IAssetManagerAdapter {
    // a trade adapter can be a mock, integrated with enzyme, or just paper trade
    function submitTrade(
        address,
        uint256,
        address,
        uint256,
        address
    ) external returns (bool);
}
