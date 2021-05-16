pragma solidity ^0.8.0;

import "./XPNSignalCore.sol";
import "./XPNSettlement.sol";

/* import "./XPNIVault.sol"; */

contract XPNCore {
    constructor() {}

    function deposit(uint256 _amount) external {
        // _deposit(_amount); //XPNXPNVaultCore
    }

    function withdraw(uint256 _amount) external {
        // _withdraw(_amount); //XPNXPNVaultCore
    }

    function submitSignal(string[] memory symbols, int256[] memory weights)
        external
    {
        // _withdrawSignal(msg.sender); //XPNPortfolio
        // _updateUserSignal(symbols, weights); //XPNPortfolio
        // _aggregateMasterSignal(symbols, weights); //XPNPortfolio
    }

    function settle(
        address[] memory _incomingAssets,
        uint256[] memory _incomingAmounts,
        address[] memory _outgoingAssets,
        uint256[] memory _outgoingAmounts,
        address[] memory _venue
    ) external {
        // preTradeSnapshot = portfolioSnapshot(); //XPNPortfolio
        // makeTrade(
        //     _incomingAssets,
        //     _incomingAmounts,
        //     _outgoingAssets,
        //     _outgoingAmounts,
        //     _venue
        // ); //XPNSettlement
        // verify(preTradeSnapshot); //XPNPortfolio
    }
}
