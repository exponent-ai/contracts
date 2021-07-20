//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../../XPNCore.sol";
import "../../interface/enzyme/IPolicy.sol";
import "../../interface/enzyme/IIntegrationManager.sol";

contract IntXPNCoreSpy is XPNCore {
    bool public whitelistPolicyResult;

    constructor(
        State memory _constructorConfig,
        string memory _tokenName,
        string memory _symbol
    ) XPNCore(_constructorConfig, _tokenName, _symbol) {}

    function addAssetConfig(
        string memory _symbol,
        address _token,
        address _feed
    ) external {
        _addAssetConfig(_symbol, _token, _feed);
    }

    function removeAssetConfig(string memory _symbol) external {
        _removeAssetConfig(_symbol);
    }

    function setSignal(address _signalPoolAddress, string memory _signalName)
        external
    {
        _setSignal(_signalPoolAddress, _signalName);
    }

    function getAssetConfig(string memory _symbol)
        external
        view
        returns (address, address)
    {
        return _getAssetConfig(_symbol);
    }

    function verifySignal(address _signal, string memory _name) external {
        _verifySignal(_signal, _name);
    }

    function initializeFundConfig() external {
        _initializeFundConfig();
    }

    function removeTrackedAsset(address _asset) external {
        _removeTrackedAsset(_asset);
    }

    function addTrackedAsset(address _asset) external {
        _addTrackedAsset(_asset);
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

    function redeemFeesHook(address _feeManager, address[] memory _fees)
        external
    {
        _redeemFeesHook(_feeManager, _fees);
    }

    function depositHook(uint256 _amount) external {
        _depositHook(_amount);
    }

    function deposit(uint256 _amount) external returns (uint256) {
        _deposit(_amount);
    }

    function withdraw(uint256 _amount)
        external
        returns (address[] memory payoutAssets, uint256[] memory payoutAmounts)
    {
        return _withdraw(_amount);
    }

    function submitTrade(bytes calldata _trade, address _venue) external {
        _submitTrade(_trade, _venue);
    }

    function createMigration(State memory _newState) external {
        _createMigration(_newState);
    }

    function signalMigration() external {
        _signalMigration();
    }

    function executeMigration() external {
        _executeMigration();
    }

    // state getters
    function getSharesAddress() external view returns (address) {
        return _getSharesAddress();
    }

    function getVaultAddress() external view returns (address) {
        return _getVaultAddress();
    }

    function getWhitelistPolicyAddress() external view returns (address) {
        return _getWhitelistPolicyAddress();
    }

    function getPolicyAddress() external view returns (address) {
        return _getPolicyAddress();
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

    /* // helper functions */

    function passesRule(address _comptrollerProxy, address _investor)
        external
        view
        returns (bool isValid_)
    {
        return
            IPolicy(_getWhitelistPolicyAddress()).passesRule(
                _comptrollerProxy,
                _investor
            );
    }

    function isAuthUserForFund(address _caller) external view returns (bool) {
        return
            IIntegrationManager(_getIntegrationManagerAddress())
                .isAuthUserForFund(_getComptrollerAddress(), _caller);
    }
}
