//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../XPNSettlement.sol";

contract XPNSettlementSpy is XPNSettlement {
    bool public result;
    bool public isWhitelist;
    uint256 public tradecount;
    uint256 public lendingcount;
    uint256 public redemptioncount;

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
        tradecount++;
        return result;
    }

    function _submitLending(bytes calldata, address)
        internal
        override
        returns (bool)
    {
        lendingcount++;
        return result;
    }

    function _submitRedemption(bytes calldata, address)
        internal
        override
        returns (bool)
    {
        redemptioncount++;
        return result;
    }

    function submitTradeOrders(
        bytes[] calldata _trades,
        address[] memory _venues
    ) external returns (bool) {
        return _submitTradeOrders(_trades, _venues);
    }

    function submitPoolOrders(
        bytes[] calldata _orders,
        Pool[] calldata _txTypes,
        address[] memory _venues
    ) external returns (bool) {
        return _submitPoolOrders(_orders, _txTypes, _venues);
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
