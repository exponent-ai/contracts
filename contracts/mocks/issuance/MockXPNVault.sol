// Copyright (C) 2021 Exponent

// This file is part of Exponent.

// Exponent is free software: you can redistribute it and/or modify // it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Exponent is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Exponent.  If not, see <http://www.gnu.org/licenses/>.

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../../LPToken.sol";

contract MockXPNVault {
    using SafeERC20 for IERC20;
    IERC20 public denomAsset;
    LPToken public vaultToken;
    uint256 public mintAmount;

    constructor(address _denomAsset) {
        vaultToken = new LPToken("EX-VAULT", "EX-VAULT");
        denomAsset = IERC20(_denomAsset);
    }

    function setMintAmount(uint256 _amount) external {
        mintAmount = _amount;
    }

    function deposit(uint256 _amount) external returns (uint256) {
        denomAsset.transferFrom(msg.sender, address(this), _amount);
        vaultToken.mint(msg.sender, mintAmount);
        return mintAmount;
    }
}
