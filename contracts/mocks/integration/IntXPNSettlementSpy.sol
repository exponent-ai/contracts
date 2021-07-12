//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../../XPNSettlement.sol";
import "../../interface/enzyme/IComptroller.sol";

contract IntXPNVSettlementSpy is XPNSettlement {
    address public comptroller;
    address public integrationManager;
    bytes4 constant TAKE_ORDER_SELECTOR =
        bytes4(keccak256("takeOrder(address,bytes,bytes)"));
    bytes4 constant LEND_ORDER_SELECTOR =
        bytes4(keccak256("lend(address,bytes,bytes)"));
    bytes4 constant REDEEM_ORDER_SELECTOR =
        bytes4(keccak256("redeem(address,bytes,bytes)"));

    constructor(address _integrationManager, address _comptroller) {
        comptroller = _comptroller;
        integrationManager = _integrationManager;
    }

    function submitTradeOrders(
        bytes[] calldata _trades,
        address[] memory _venues
    ) external {
        _submitTradeOrders(_trades, _venues);
    }

    function submitPoolOrders(
        bytes[] calldata _orders,
        Pool[] calldata _txTypes,
        address[] memory _venues
    ) external {
        _submitPoolOrders(_orders, _txTypes, _venues);
    }

    function _submitTrade(bytes calldata _trade, address _venue)
        internal
        override
        returns (bool successfulTrade)
    {
        bytes memory callargs = abi.encode(_venue, TAKE_ORDER_SELECTOR, _trade);
        IComptroller(comptroller).callOnExtension(
            integrationManager,
            0,
            callargs
        );
        return true;
    }

    function _submitLending(bytes calldata _lending, address _venue)
        internal
        override
        returns (bool)
    {
        bytes memory callargs =
            abi.encode(_venue, LEND_ORDER_SELECTOR, _lending);
        IComptroller(comptroller).callOnExtension(
            integrationManager,
            0,
            callargs
        );
        return true;
    }

    function _submitRedemption(bytes calldata _redemption, address _venue)
        internal
        override
        returns (bool)
    {
        bytes memory callargs =
            abi.encode(_venue, REDEEM_ORDER_SELECTOR, _redemption);
        IComptroller(comptroller).callOnExtension(
            integrationManager,
            0,
            callargs
        );
        return true;
    }

    function _venueIsWhitelisted(address)
        internal
        view
        override
        returns (bool)
    {
        return true;
    }
}
