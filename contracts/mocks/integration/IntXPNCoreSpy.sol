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
        return (
            symbolToAsset[_symbol],
            assetToPriceFeed[symbolToAsset[_symbol]]
        );
    }

    function verifySignal(address _signal, string memory _name) external {
        _verifySignal(_signal, _name);
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
        return globalState.EZshares;
    }

    function getWhitelistPolicyAddress() external view returns (address) {
        return globalState.EZwhitelistPolicy;
    }

    function getPolicyAddress() external view returns (address) {
        return globalState.EZpolicy;
    }


    function getTrackedAssetAddress() external view returns (address) {
        return globalState.EZtrackedAssetAdapter;
    }

    function getIntegrationManagerAddress() external view returns (address) {
        return globalState.EZintegrationManager;
    }

    function getDeployerAddress() external view returns (address) {
        return globalState.EZdeployer;
    }

    function getComptrollerAddress() external view returns (address) {
        return globalState.EZcomptroller;
    }

    function isVenueWhitelist(address _venue) external view returns (bool) {
        return venueWhitelist[_venue];
    }

    function isAssetWhitelist(address _asset) external view returns (bool) {
        return assetWhitelist[_asset];
    }

    function passesRule(address _comptrollerProxy, address _investor)
        external
        view
        returns (bool isValid_)
    {
        return
            IPolicy(globalState.EZwhitelistPolicy).passesRule(
                _comptrollerProxy,
                _investor
            );
    }

    function isAuthUserForFund(address _caller) external view returns (bool) {
        return
            IIntegrationManager(globalState.EZintegrationManager)
                .isAuthUserForFund(globalState.EZcomptroller, _caller);
    }
}
