//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./interface/enzyme/IComptroller.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EnzymeAdapter is Ownable {
    address public comptroller;
    address public integrationManager;
    bytes4 constant TAKE_ORDER_SELECTOR =
        bytes4(keccak256("takeOrder(address,bytes,bytes)"));

    constructor(
        address _integrationManager,
        address _comptroller,
        address _tradeSettler
    ) {
        comptroller = _comptroller;
        integrationManager = _integrationManager;
        transferOwnership(_tradeSettler);
    }

    function submitTrade(
        address _incomingAsset,
        uint256 _incomingAmount,
        address _outgoingAsset,
        uint256 _outgoingAmount,
        address _venue
    ) external onlyOwner returns (bool successfulTrade) {
        bytes memory param =
            abi.encode(
                _incomingAsset,
                _incomingAmount,
                _outgoingAsset,
                _outgoingAmount
            );
        bytes memory callargs = abi.encode(_venue, TAKE_ORDER_SELECTOR, param);
        (bool success, ) =
            comptroller.delegatecall(
                abi.encodeWithSelector(
                    IComptroller.callOnExtension.selector,
                    integrationManager,
                    0,
                    callargs
                )
            );
        return success;
    }
}
