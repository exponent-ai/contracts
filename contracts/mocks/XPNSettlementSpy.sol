//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../XPNSettlement.sol";

contract XPNSettlementSpy is XPNSettlement {
    bool public result;
    uint256 public count;

    function setReturnMsg(bool _result) public {
        result = _result;
    }

    function _submitTrade(bytes calldata, address)
        internal
        override
        returns (bool)
    {
        count++;
        return result;
    }
}
