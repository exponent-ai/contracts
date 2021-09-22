// Copyright (C) 2021 Exponent

// This file is part of Exponent.

// Exponent is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Exponent is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Exponent.  If not, see <http://www.gnu.org/licenses/>.

pragma solidity ^0.8.0;

import "../XPNUtils.sol";

contract XPNUtilsSpy {
    function compareStrings(string memory first, string memory second)
        public
        pure
        returns (bool)
    {
        return XPNUtils.compareStrings(first, second);
    }

    function parseChainlinkPrice(address _feed) external view returns (int256) {
        return XPNUtils.parseChainlinkPrice(_feed);
    }
}
