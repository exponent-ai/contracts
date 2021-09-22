//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./MockERC20.sol";
import "../XPNMain.sol";

contract SharesCaller {
    XPNMain public vault;
    MockERC20 public denomAsset;

    constructor(address _vault, address _erc20) {
        vault = XPNMain(_vault);
        denomAsset = MockERC20(_erc20);
    }

    function approve(address to, uint256 amount) external {
        denomAsset.approve(to, amount);
    }

    function deposit(uint256 _amount) external {
        vault.deposit(_amount);
    }

    function multiWithdraws(uint256[] memory _amounts) external {
        for (uint256 i = 0; i < _amounts.length; i++) {
            vault.withdraw(_amounts[i]);
        }
    }
}
