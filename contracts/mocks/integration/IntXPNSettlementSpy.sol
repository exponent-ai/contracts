//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../../XPNSettlement.sol";
import "../../interface/enzyme/IComptroller.sol";

contract IntXPNVSettlementSpy is XPNSettlement {
    address public comptroller;
    address public integrationManager;
    bytes4 constant TAKE_ORDER_SELECTOR =
        bytes4(keccak256("takeOrder(address,bytes,bytes)"));

    constructor(address _integrationManager, address _comptroller) {
        comptroller = _comptroller;
        integrationManager = _integrationManager;
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
}
