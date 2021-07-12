//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "./XPNCore.sol";
import "./interface/IXPN.sol";

contract XPNMain is IXPN, XPNCore {
    constructor(
        State memory _constructorConfig,
        address _denomAsset,
        string memory _tokenName,
        string memory _symbol
    ) XPNCore(_constructorConfig, _denomAsset, _tokenName, _symbol) {}

    // external functions
    function setSignal(address signalPoolAddress, string memory _signalName)
        external
    {
        _setSignal(signalPoolAddress, _signalName);
    }

    // initialize fund config
    function initializeFundConfig() external {
        _initializeFundConfig();
    }

    function whitelistVenue(address _venue) external {
        _whitelistVenue(_venue);
    }

    function whitelistAsset(address _asset) external {
        _whitelistAsset(_asset);
    }

    function deWhitelistVenue(address _venue) external {
        _deWhitelistVenue(_venue);
    }

    function deWhitelistAsset(address _asset) external {
        _deWhitelistAsset(_asset);
    }

    // deposit external function
    function deposit(uint256 _amount) external override returns (uint256) {
        return _deposit(_amount);
    }

    // withdrawal external function
    function withdraw(uint256 _amount)
        external
        override
        returns (address[] memory payoutAssets, uint256[] memory payoutAmounts)
    {
        return _withdraw(_amount);
    }

    // redeemShares external function
    function redeemFees(address _feeManager, address[] calldata _fees)
        external
        nonReentrant
        returns (address[] memory payoutAssets, uint256[] memory payoutAmounts)
    {
        return _redeemFees(_feeManager, _fees);
    }

    // submit trade
    function submitTradeOrders(
        bytes[] calldata _trades,
        address[] memory _venues
    ) external override returns (bool) {
        return _settle(_trades, _venues);
    }

    // add tracked asset
    function addTrackedAsset(address _asset) external {
        _addTrackedAsset(_asset);
    }

    // remove  tracked asset
    function removeTrackedAsset(address _asset) external {
        _removeTrackedAsset(_asset);
    }

    // calculate gross asset value
    function calcGav(bool) external override returns (uint256, bool) {}

    // calcualte gross lp token value
    function calcGrossLPValue(bool) external override returns (uint256, bool) {}

    function getDenominationAsset() external view override returns (address) {}

    function getLPTokenAddress() external view override returns (address) {}

    function getTrackedAssets()
        external
        view
        override
        returns (address[] memory)
    {}

    // external state getters
    function getStrategistAddress() external view override returns (address) {}

    function getSharesAddress() external view returns (address) {
        return _getSharesAddress();
    }

    function getAdminAddress() external view override returns (address) {
        return _getAdminAddress();
    }

    function getWhitelistPolicyAddress() external view returns (address) {
        return _getWhitelistPolicyAddress();
    }

    function getPolicyAddress() external view returns (address) {
        return _getPolicyAddress();
    }

    function getSettlerAddress() external view returns (address) {
        return _getSettlerAddress();
    }

    function getTrackedAssetAddress() external view returns (address) {
        return _getTrackedAssetAddress();
    }

    function getIntegrationManagerAddress() external view returns (address) {
        return _getIntegrationManagerAddress();
    }

    function getDeployerAddress() external view returns (address) {
        return _getDeployerAddress();
    }

    function getComptrollerAddress() external view returns (address) {
        return _getComptrollerAddress();
    }

    function venueWhitelist(address _venue) external view returns (bool) {
        return _isVenueWhitelisted(_venue);
    }

    function assetWhitelist(address _asset) external view returns (bool) {
        return _isAssetWhitelisted(_asset);
    }

    function configInitialized() external view returns (bool) {
        return _isConfigInitialized();
    }

    function addAssetConfig(
        string memory _symbol,
        address _token,
        address _feed
    ) external {
        _addAssetConfig(_symbol, _token, _feed);
    }

    // only expose diff related info.

    function signalPortfolioDiffPercent() external view returns (int256) {
        return _signalPortfolioDiffPercent();
    }

    function signalPortfolioDiffToken()
        external
        view
        returns (int256[] memory)
    {
        return _signalPortfolioDiffToken();
    }

    function signalPortfolioDiffAllocation()
        external
        view
        returns (int256[] memory)
    {
        return _signalPortfolioDiffAllocation();
    }

    function signalPortfolioDiffValue()
        external
        view
        returns (int256[] memory)
    {
        return _signalPortfolioDiffValue();
    }

    // @notice set expected trade efficiency 
    // @dev note 1e18 = 100% default is 98e16 (98%)
    function setExpectedEfficientcy(int256 _expectedEfficientcy) external {
        _setExpectedEfficientcy(_expectedEfficientcy);
    }
}
