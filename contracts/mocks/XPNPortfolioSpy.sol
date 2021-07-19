pragma solidity ^0.8.0;

import "../XPNPortfolio.sol";
import "../XPNUtils.sol";

contract XPNPortfolioSpy is XPNPortfolio {
    using XPNSignalMath for int256[];

    // TODO: integrate with real fund and dex
    int256[] public fundsAsset;
    int256[] public tokenPrice;
    mapping(string => address) symbolTokenMap;
    address vaultAddress;
    ISignal private signalPool;
    string private signalName;

    constructor() XPNPortfolio() {
        fundsAsset = [int256(0), int256(0), int256(0)];
        tokenPrice = [int256(56e18), int256(1600e18), int256(1e18)];
    }

    function callSetSignal(
        address _signalPoolAddress,
        string memory _signalName
    ) public {
        _setSignal(_signalPoolAddress, _signalName);
    }

    // @notice set target signal
    // @param signalPoolAddress address of signal contract
    // @param signalName name of the target signal in the signal contract
    // @dev this function assume that caller already verify the compatability off chain.
    function _setSignal(address signalPoolAddress, string memory _signalName)
        internal
    {
        signalPool = ISignal(signalPoolAddress);
        signalName = _signalName;
    }

    // @notice Get signal same
    // @return string name of active signal
    function _getSignalName() internal view returns (string memory) {
        return signalName;
    }

    // @notice Get signal pool address
    // @return address signal contract address
    function _getSignalPool() internal view returns (address) {
        return address(signalPool);
    }

    function _getSignal() internal view override returns (int256[] memory) {
        return signalPool.getSignal(signalName);
    }

    function _getSignalSymbols()
        internal
        view
        override
        returns (string[] memory)
    {
        return signalPool.getSignalSymbols(signalName);
    }

    function setVaultAddress(address _vaultAddress) public {
        vaultAddress = _vaultAddress;
    }

    function _getExpectedEfficiency() internal view override returns (int256) {
        return 98e16;
    }

    function _getVaultAddress() internal view override returns (address) {
        return vaultAddress;
    }

    function setSymbolToToken(string memory _symbol, address tokenAddress)
        public
    {
        symbolTokenMap[_symbol] = tokenAddress;
    }

    function _getSymbolToToken(string memory _symbol)
        internal
        view
        override
        returns (address)
    {
        return symbolTokenMap[_symbol];
    }

    function _getTokensPrice()
        internal
        view
        override
        returns (int256[] memory)
    {
        /*
            token prices
        */
        return tokenPrice;
    }

    function setTokensPrice(int256[] memory _tokenPrice) public {
        /*
            token prices
        */
        tokenPrice = _tokenPrice;
    }

    function viewPortfolioToken() external view returns (int256[] memory) {
        return _viewPortfolioToken();
    }

    function getTokensPrice() external view virtual returns (int256[] memory) {
        return _getTokensPrice();
    }

    function viewPortfolioMixValue() external view returns (int256[] memory) {
        return _viewPortfolioMixValue();
    }

    function viewPortfolioAllocation() external view returns (int256[] memory) {
        return _viewPortfolioAllocation();
    }

    function signalPortfolioDiffAllocation()
        external
        view
        returns (int256[] memory)
    {
        return _signalPortfolioDiffAllocation();
    }

    function portfolioValue() external view virtual returns (int256 value) {
        return _portfolioValue();
    }

    function signalPortfolioDiffAllovcation()
        external
        view
        virtual
        returns (int256[] memory)
    {
        return _signalPortfolioDiffAllocation();
    }

    function signalPortfolioDiffValue()
        external
        view
        virtual
        returns (int256[] memory)
    {
        return _signalPortfolioDiffValue();
    }

    function signalPortfolioDiffToken()
        external
        view
        virtual
        returns (int256[] memory)
    {
        return _signalPortfolioDiffToken();
    }

    function signalPortfolioDiffPercent()
        external
        view
        virtual
        returns (int256 value)
    {
        return _signalPortfolioDiffPercent();
    }
}
