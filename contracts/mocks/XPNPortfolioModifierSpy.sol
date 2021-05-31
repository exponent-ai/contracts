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
        set_portfolioValue(_portValue);
        _set_signalPortfolioDiffPercent(_diffPercent);
    }

    function set_portfolioValue(int256 _value) public {
        value = _value;
    }

    function _set_signalPortfolioDiffPercent(int256 _distance) public {
        distance = _distance;
    }

    function _portfolioValue() internal view override returns (int256) {
        return value;
    }

    function _signalPortfolioDiffPercent()
        internal
        view
        override
        returns (int256)
    {
        return distance;
    }
}
