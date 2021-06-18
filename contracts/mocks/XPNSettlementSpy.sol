//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../XPNSettlement.sol";

contract XPNSettlementSpy is XPNSettlement {
    bool public result;
    bool public isWhitelist;
    uint256 public count;

    function setReturnMsg(bool _result) public {
        result = _result;
    }

    function setIsWhitelist(bool _result) public {
        isWhitelist = _result;
    }

    function _submitTrade(bytes calldata, address)
        internal
        override
        returns (bool)
    {
        count++;
        return result;
    }

    function submitTradeOrders(
        bytes[] calldata _trades,
        address[] memory _venues
    ) external returns (bool) {
        return _submitTradeOrders(_trades, _venues);
    }

    function _venueIsWhitelisted(address)
        internal
        view
        override
        returns (bool)
    {
        return isWhitelist;
    }
}
