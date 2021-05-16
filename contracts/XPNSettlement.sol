//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

// @title core application logic and API for trade submissions
contract XPNSettlement {
    event SubmitTradeOrders(address indexed, bytes[], address[]);

    // @notice submit multiple trade orders
    // @param _trades array of ABI encoded trades to submit
    // @param _venues array of trading venues address
    // @dev each order based on corresponding index of the input
    function submitTradeOrders(
        bytes[] calldata _trades,
        address[] memory _venues
    ) external virtual returns (bool) {
        uint256 tradesLength = _trades.length;
        require(
            _venues.length == tradesLength,
            "TradeSettlement: trade submissions input length not equal"
        );
        for (uint8 i = 0; i < tradesLength; i++) {
            bool success = _submitTrade(_trades[i], _venues[i]);
            require(success, "TradeSettlement: a trade did not execute");
        }
        emit SubmitTradeOrders(msg.sender, _trades, _venues);
        return true;
    }

    function _submitTrade(bytes calldata _trade, address _venue)
        internal
        virtual
        returns (bool)
    {}
}
