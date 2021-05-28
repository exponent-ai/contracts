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
        setSignal(_signalPoolAddress, _signalName);
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
