//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IFundDeployer {
    function createNewFund(
        address,
        string calldata,
        address,
        uint256,
        bytes calldata,
        bytes calldata
    ) external returns (address, address);
}
