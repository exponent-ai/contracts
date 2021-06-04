pragma solidity ^0.8.0;

import "./XPNUtils.sol";
import "./interface/ISignal.sol";
import "./XPNSignalMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// @notice portfolio module.
contract XPNPortfolio {
    using XPNSignalMath for int256[];
    int256 public constant ONE = 1e18;

    mapping(uint256 => uint256) private performance;
    mapping(string => AggregatorV3Interface) symbolPricefeed;
    int256 expectedEfficientcy = 98e16;

    ISignal private signalPool;
    string private signalName;

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

    function _getSignalName() internal view returns (string memory) {
        return signalName;
    }

    function _getSignalPool() internal view returns (address) {
        return address(signalPool);
    }

    function _getVaultAddress() internal view virtual returns (address) {}

    function _getSymbolToToken(string memory _symbol)
        internal
        view
        virtual
        returns (address)
    {}

    function _getTokenPrice(address _asset)
        internal
        view
        virtual
        returns (int256)
    {}

    function _getDenomAssetSymbol()
        internal
        view
        virtual
        returns (string memory)
    {}

    function _viewPortfolioToken()
        internal
        view
        virtual
        returns (int256[] memory)
    {
        /*
        return amount of each asset. (in token)
        TODO: refactor 
        */
        // resolves symbols to addresses
        int256[] memory tokens;
        string[] memory symbols = signalPool.getSignalMeta(signalName);
        for (uint256 i = 0; i < symbols.length; i++) {
            tokens[i] = int256(
                IERC20(_getSymbolToToken(symbols[i])).balanceOf(
                    _getVaultAddress()
                )
            );
        }
        return tokens;
    }

    function _getTokensPrice() internal view virtual returns (int256[] memory) {
        string[] memory symbols = signalPool.getSignalMeta(signalName);
        int256[] memory prices;
        // resolves symbol to asset token
        for (uint256 i; i < symbols.length; i++) {
            string memory symbol = symbols[i];
            if (XPNUtils.compareStrings(symbol, _getDenomAssetSymbol())) {
                prices[i] = int256(1);
                continue;
            }
            int256 price = _getTokenPrice(_getSymbolToToken(symbol));
            prices[i] = price;
        }
        return prices;
    }

    function _viewPortfolioMixValue() internal view returns (int256[] memory) {
        /*
            return value of each asset. (in usd) 
            TODO: refactor 
            */
        return _viewPortfolioToken().elementWiseMul(_getTokensPrice());
    }

    function _viewPortfolioAllocation()
        internal
        view
        returns (int256[] memory)
    {
        /*
            return allocation of each asset. (in % of portfolio) - sum = 1e18
            */
        return _viewPortfolioMixValue().normalize();
    }

    function _signalPortfolioDiffAllocation()
        internal
        view
        returns (int256[] memory)
    {
        /*
            get different in % allocation between master signal and current portfolio allocation
        */
        return
            signalPool.getSignal(signalName).normalize().elementWiseSub(
                _viewPortfolioAllocation()
            );
    }

    function _signalPortfolioDiffValue()
        internal
        view
        returns (int256[] memory)
    {
        /*
            get different in value allocation between master signal and current portfolio allocation
            TODO: refactor
        */
        return _signalPortfolioDiffAllocation().vectorScale(_portfolioValue());
    }

    function _signalPortfolioDiffToken()
        internal
        view
        returns (int256[] memory)
    {
        /*
            get different in token allocation between master signal and current portfolio allocation
            TODO: implement this
        */
        return _signalPortfolioDiffValue().elementWiseDiv(_getTokensPrice());
    }

    function _portfolioValue() internal view virtual returns (int256 value) {
        /*
            porfolio value in usd
        */
        value = _viewPortfolioMixValue().sum();
    }

    function _signalPortfolioDiffPercent()
        internal
        view
        virtual
        returns (int256 distance)
    {
        /*
        distance between target vs current portfolioallocation (how much value needed to be move) (in %)
        calculate as sum(token-wise diff)/ 2
        */
        distance = _signalPortfolioDiffAllocation().l1Norm() / 2;
    }

    modifier ensureTrade() {
        int256 preTradeValue = _portfolioValue();
        int256 preTradeDistance = _signalPortfolioDiffPercent();
        _;
        int256 distanceImproved =
            preTradeDistance - _signalPortfolioDiffPercent();
        int256 valueLoss = preTradeValue - _portfolioValue();
        int256 expectedLoss =
            (((preTradeValue * distanceImproved) / ONE) *
                (ONE - expectedEfficientcy)) / ONE;

        require(
            distanceImproved > 0 && valueLoss < expectedLoss,
            "trade requirement not satisfy"
        );
    }
}
