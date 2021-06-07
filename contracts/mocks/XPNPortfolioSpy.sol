pragma solidity ^0.8.0;

import "../XPNPortfolio.sol";
import "../XPNUtils.sol";

contract XPNPortfolioSpy is XPNPortfolio {
    using XPNSignalMath for int256[];

    // TODO: integrate with real fund and dex
    int256[] public fundsAsset;
    int256[] public tokenPrice;

    constructor() XPNPortfolio() {
        fundsAsset = [int256(0), int256(0), int256(0)];
        tokenPrice = [int256(56e18), int256(1600e18), int256(1e18)];
    }

    function mockSetSignal(
        address _signalPoolAddress,
        string memory _signalName
    ) public {
        _setSignal(_signalPoolAddress, _signalName);
    }

    function _viewPortfolioToken()
        internal
        view
        override
        returns (int256[] memory)
    {
        /*
        return amount of each asset. (in token)
        TODO: refactor 
        */
        return fundsAsset;
    }

    // TODO: remove all function below this line

    function mockDeposit(uint256 assetIndex, int256 amount) external {
        /*
            mock deposit 
        */
        fundsAsset[assetIndex] += amount;
    }

    function setToken(int256[] memory _fundsAsset) external {
        /*
            set token
        */
        fundsAsset = _fundsAsset;
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
