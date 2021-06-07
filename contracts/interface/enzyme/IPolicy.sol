//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IPolicy {
    function passesRule(address _comptrollerProxy, address _investor)
        external
        view
        returns (bool isValid_);
}
