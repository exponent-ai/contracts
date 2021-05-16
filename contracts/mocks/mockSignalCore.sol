pragma solidity ^0.8.0;

import "../XPNSignalCore.sol";
import "../XPNUtils.sol";

contract MockSignalFund is XPNSignalCore {
    using XPNSignalMath for int256[];

    // TODO: integrate with real fund and dex
    int256[] public fundsAsset;
    int256[] public tokenPrice;

    constructor(
        address _vaultAddress,
        string[] memory _symbols,
        address[] memory _assetERC20address,
        address[] memory pricefeeds
    ) XPNSignalCore(_vaultAddress, _symbols, _assetERC20address, pricefeeds) {
        fundsAsset = [int256(0), int256(0), int256(0)];
        tokenPrice = [int256(56e18), int256(1600e18), int256(1e18)];
    }

    function viewPortfolioToken()
        public
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
    /*
        mock various function just for development 
    */
    function magicDexNow() external {
        /*
            fill trade with some cost.
            implement as sell all intended amount to get target asset - some fee
            e.g. at 1:50 btc:eth at 99.5% efficiency rate (0.5% loss)
            sell 1 btc -> eth will result in -1 btc, + 49.75 eth
        */
        fundsAsset = fundsAsset.elementWiseAdd(signalPortfolioDiffToken());
    }

    function mockDeposit(uint256 assetIndex, int256 amount) external {
        /*
            mock deposit 
        */
        fundsAsset[assetIndex] += amount;
    }

    function getTokensPrice() public view override returns (int256[] memory) {
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
}
