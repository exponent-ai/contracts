pragma solidity ^0.8.0;

import "../XPNPortfolio.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract XPNPortfolioModifierSpy is XPNPortfolio {
    int256 value = 0;
    int256 distance = 0;

    function settleTrade(int256 _portValue, int256 _diffPercent)
        public
        ensureTrade
    {
        setPortfolioValue(_portValue);
        setSignalPortfolioDiffPercent(_diffPercent);
    }

    function setPortfolioValue(int256 _value) public {
        value = _value;
    }

    function setSignalPortfolioDiffPercent(int256 _distance) public {
        distance = _distance;
    }

    function portfolioValue() public view override returns (int256) {
        return value;
    }

    function signalPortfolioDiffPercent()
        public
        view
        override
        returns (int256)
    {
        return distance;
    }
}
