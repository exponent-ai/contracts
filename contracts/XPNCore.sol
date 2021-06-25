//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "./XPNSettlement.sol";
import "./XPNUtils.sol";
import "./XPNVault.sol";
import "./XPNPortfolio.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interface/enzyme/IFundDeployer.sol";
import "./interface/enzyme/IComptroller.sol";
import "./interface/enzyme/IIntegrationManager.sol";
import "./interface/enzyme/IPolicyManager.sol";

// @title core contract for XPN
// @notice responsible for the global state of the entire contract and external interactions
// @dev overrides all functional _hooks and lazy-hydrate state to downstream functional contracts,
contract XPNCore is XPNVault, XPNSettlement, XPNPortfolio {
    using SafeERC20 for IERC20;

    //TODO make external contract explicit
    struct State {
        address admin; // xpn admin account
        address settler; // EOA responsible for calling settlement
        address signal; // contract address for signal to pull from
        string denomAssetSymbol; // symbol of the denominated asset
        address EZdeployer; // Enzyme FundDeployer contract
        address EZintegrationManager; // Enzyme IntegrationManager contract
        address EZtrackedAssetAdapter; // Enzyme TrackedAssetAdapter contract
        address EZpolicy; // Enzyme PolicyManager contract
        address EZwhitelistPolicy; // Enzyme InvestorWhitelist contract
        address EZcomptroller; // Enzyme Vault's ComptrollerProxy contract
        address EZshares; // Enzyme Vault's shares
        bytes EZfeeConfig; // configuration for fees
        string name; // name of the fund on Enzyme Vault
    }

    // @notice application state
    State private globalState;

    // @notice a hardcoded selector for all Enzyme DEX trades
    bytes4 constant TAKE_ORDER_SELECTOR =
        bytes4(keccak256("takeOrder(address,bytes,bytes)"));
    // @notice a hardcoded selector for all Enzyme lending
    bytes4 constant LEND_ORDER_SELECTOR =
        bytes4(keccak256("lend(address,bytes,bytes)"));
    // @notice a hardcoded selector for all Enzyme redemption
    bytes4 constant REDEEM_ORDER_SELECTOR =
        bytes4(keccak256("redeem(address,bytes,bytes)"));

    bool private configInitialized;

    mapping(address => bool) private venueWhitelist;
    mapping(address => bool) private assetWhitelist;
    mapping(string => address) private symbolToAsset;
    mapping(address => address) private assetToPriceFeed;

    event VenueWhitelisted(address venue);
    event AssetWhitelisted(address venue);
    event VenueDeWhitelisted(address venue);
    event AssetDeWhitelisted(address venue);
    event TrackedAssetAdded(address asset);
    event TrackedAssetRemoved(address asset);
    event AssetConfigAdded(string symbol, address asset, address feed);
    event AssetConfigRemoved(string symbol);
    event NewSignal(address signal);

    constructor(
        State memory _constructorConfig,
        address _denomAsset,
        string memory _tokenName,
        string memory _symbol
    )
        XPNPortfolio()
        XPNVault(_denomAsset, _tokenName, _symbol)
        XPNSettlement()
    {
        globalState = _constructorConfig;
        _whitelistAsset(_denomAsset);
        (address comptrollerAddress, address sharesAddress) =
            IFundDeployer(globalState.EZdeployer).createNewFund(
                address(this),
                globalState.name,
                address(denomAsset),
                1,
                globalState.EZfeeConfig,
                ""
            );
        globalState.EZcomptroller = comptrollerAddress;
        globalState.EZshares = sharesAddress;
    }

    // @notice make self a sole depositor to the Enzyme Vault
    // @developer must be called after the deployment, can't be called as part of constructor
    // as self address is required as a function argument to IntegrationManager
    function _initializeFundConfig() internal {
        require(!configInitialized, "XPNCore: config already initialized");
        // only if signal supports whitelisted assets
        _verifySignal(globalState.signal, _getSignalName()); //TODO should pass name from globalState
        // only this contract can deposit
        address[] memory buyersToAdd = new address[](1);
        address[] memory buyersToRemove = new address[](0);
        buyersToAdd[0] = address(this);
        bytes memory policySettings = abi.encode(buyersToAdd, buyersToRemove);
        IPolicyManager(globalState.EZpolicy).enablePolicyForFund(
            globalState.EZcomptroller,
            globalState.EZwhitelistPolicy,
            policySettings
        );
        configInitialized = true;
    }

    // @notice configure token address and price feed to symbol
    // @developer must ensure beforehand that the price feed is correct
    function _addAssetConfig(
        string memory _symbol,
        address _token,
        address _feed
    ) internal {
        symbolToAsset[_symbol] = _token;
        assetToPriceFeed[_token] = _feed;
        emit AssetConfigAdded(_symbol, _token, _feed);
    }

    // @notice remove configuration for symbol
    function _removeAssetConfig(string memory _symbol) internal {
        address prevAddress = symbolToAsset[_symbol];
        symbolToAsset[_symbol] = address(0);
        assetToPriceFeed[prevAddress] = address(0);
        emit AssetConfigRemoved(_symbol);
    }

    // @notice identify who can create settlement transaction
    function _swapSettler(address _newSettler) internal {
        globalState.settler = _newSettler;
    }

    // @notice swap out to another signal contract
    // @dev will ensure that the signal supports the correct asset symbols, but makes no correctness assumption
    // TODO should take signal and name inside globalState
    function _swapSignal(address _signal, string memory _name) internal {
        _verifySignal(_signal, _name);
        globalState.signal = _signal;
        _setSignal(_signal, _name);
        emit NewSignal(_signal);
    }

    function _whitelistVenue(address _venue) internal {
        venueWhitelist[_venue] = true;
        emit VenueWhitelisted(_venue);
    }

    function _whitelistAsset(address _asset) internal {
        assetWhitelist[_asset] = true;
        emit AssetWhitelisted(_asset);
    }

    function _deWhitelistVenue(address _venue) internal {
        venueWhitelist[_venue] = false;
        emit VenueDeWhitelisted(_venue);
    }

    function _deWhitelistAsset(address _asset) internal {
        assetWhitelist[_asset] = false;
        emit AssetDeWhitelisted(_asset);
    }

    function _settleTrade(bytes[] calldata _trades, address[] memory _venues)
        internal
        ensureTrade
        returns (bool)
    {
        return _submitTradeOrders(_trades, _venues);
    }

    function _settlePool(
        bytes[] calldata _orders,
        Pool[] calldata _txTypes,
        address[] memory _venues
    ) internal ensureTrade returns (bool) {
        return _submitPoolOrders(_orders, _txTypes, _venues);
    }

    // @notice verify that the assets in the provided signal contract is supported
    function _verifySignal(address _signal, string memory _signalName)
        internal
    {
        string[] memory symbols = ISignal(_signal).getSignalMeta(_signalName);
        for (uint256 i; i < symbols.length; i++) {
            string memory symbol = symbols[i];
            if (XPNUtils.compareStrings(symbol, _getDenomAssetSymbol())) {
                continue;
            }
            require(
                symbolToAsset[symbol] != address(0),
                "XPNCore: token symbol is not registered"
            );
            require(
                _isAssetWhitelisted(symbolToAsset[symbol]),
                "XPNCore: token is not whitelisted"
            );
        }
    }

    // TODO: make sure that this function use in sync with setSignal
    function _addTrackedAsset(address _asset) internal {
        require(configInitialized, "XPNCore: config not yet initialized");
        uint256 actionID = 1;
        address[] memory assets = new address[](1);
        assets[0] = _asset;
        bytes memory addTrackedArgs = abi.encode(assets);
        IComptroller(globalState.EZcomptroller).callOnExtension(
            globalState.EZintegrationManager,
            actionID,
            addTrackedArgs
        );
        emit TrackedAssetAdded(_asset);
    }

    // TODO: make sure that this function use in sync with setSignal
    function _removeTrackedAsset(address _asset) internal {
        uint256 actionID = 2;
        address[] memory assets = new address[](1);
        assets[0] = _asset;
        bytes memory removeTrackedArgs = abi.encode(assets);
        IComptroller(globalState.EZcomptroller).callOnExtension(
            globalState.EZintegrationManager,
            actionID,
            removeTrackedArgs
        );
        emit TrackedAssetRemoved(_asset);
    }

    // overridden functions
    function _getTokenPrice(address _asset)
        internal
        view
        override
        returns (int256)
    {
        (, int256 price, , , ) =
            AggregatorV3Interface(assetToPriceFeed[_asset]).latestRoundData();
        return price;
    }

    function _getVaultAddress() internal view override returns (address) {
        return globalState.EZshares;
    }

    function _getSymbolToToken(string memory _symbol)
        internal
        view
        override
        returns (address)
    {
        return symbolToAsset[_symbol];
    }

    function _getDenomAssetSymbol()
        internal
        view
        override
        returns (string memory)
    {
        return globalState.denomAssetSymbol;
    }

    function _depositHook(uint256 _amount) internal override returns (uint256) {
        require(configInitialized, "XPNCore: config not yet initialized");
        denomAsset.approve(address(globalState.EZcomptroller), _amount);
        address[] memory buyers = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        buyers[0] = address(this);
        amounts[0] = _amount;
        uint256[] memory sharesBought =
            IComptroller(globalState.EZcomptroller).buyShares(
                buyers,
                amounts,
                amounts
            );
        return sharesBought[0]; // should have bought only a single share
    }

    function _withdrawHook(uint256 _amount)
        internal
        override
        returns (address[] memory, uint256[] memory)
    {
        address[] memory additionalAssets = new address[](0);
        address[] memory assetsToSkip = new address[](0);
        return
            IComptroller(globalState.EZcomptroller).redeemSharesDetailed(
                _amount,
                additionalAssets,
                assetsToSkip
            );
    }

    function _venueIsWhitelisted(address _venue)
        internal
        view
        override
        returns (bool)
    {
        return venueWhitelist[_venue];
    }

    function _submitTrade(bytes calldata _trade, address _venue)
        internal
        override
        returns (bool successfulTrade)
    {
        bytes memory callargs = abi.encode(_venue, TAKE_ORDER_SELECTOR, _trade);
        IComptroller(globalState.EZcomptroller).callOnExtension(
            globalState.EZintegrationManager,
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
        IComptroller(globalState.EZcomptroller).callOnExtension(
            globalState.EZintegrationManager,
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
        IComptroller(globalState.EZcomptroller).callOnExtension(
            globalState.EZintegrationManager,
            0,
            callargs
        );
        return true;
    }

    function _redeemFeesHook(address _feeManager, address[] memory _fees)
        internal
        override
    {
        IComptroller(globalState.EZcomptroller).callOnExtension(
            _feeManager,
            0,
            ""
        );
        IComptroller(globalState.EZcomptroller).callOnExtension(
            _feeManager,
            1,
            abi.encode(_fees)
        );
    }

    // state getters

    function _getSharesAddress() internal view override returns (address) {
        return globalState.EZshares;
    }

    function _getAdminAddress() internal view override returns (address) {
        return globalState.admin;
    }

    function _getPolicyAddress() internal view returns (address) {
        return globalState.EZpolicy;
    }

    function _getSettlerAddress() internal view returns (address) {
        return globalState.settler;
    }

    function _getTrackedAssetAddress() internal view returns (address) {
        return globalState.EZtrackedAssetAdapter;
    }

    function _getIntegrationManagerAddress() internal view returns (address) {
        return globalState.EZintegrationManager;
    }

    function _getDeployerAddress() internal view returns (address) {
        return globalState.EZdeployer;
    }

    function _getComptrollerAddress() internal view returns (address) {
        return globalState.EZcomptroller;
    }

    function _getWhitelistPolicyAddress() internal view returns (address) {
        return globalState.EZwhitelistPolicy;
    }

    function _getAssetConfig(string memory _symbol)
        internal
        view
        returns (address, address)
    {
        return (
            symbolToAsset[_symbol],
            assetToPriceFeed[symbolToAsset[_symbol]]
        );
    }

    function _isConfigInitialized() internal view returns (bool) {
        return configInitialized;
    }

    function _isVenueWhitelisted(address _venue) internal view returns (bool) {
        return venueWhitelist[_venue];
    }

    function _isAssetWhitelisted(address _asset) internal view returns (bool) {
        return assetWhitelist[_asset];
    }
}
