pragma solidity ^0.8.0;

import "./interface/AggregatorV3Interface.sol";
import "./XPNSignalMath.sol";
import "./XPNUtils.sol";

contract XPNSignalCore {
    using XPNSignalMath for int256[];

    int256 public constant ONE = 1e18;

    // symbols [], signal [] , weight !
    string[] public masterSymbols;
    int256[] public nullSignal;
    string public denominatedAsset;
    int256[] public masterSignal;
    int256 public masterWeight;

    mapping(address => int256[]) userSignal;
    mapping(address => int256) userWeight;
    address public vault_address;
    address[] assetAddress;
    mapping(string => AggregatorV3Interface) symbolPricefeed;

    constructor(
        address _vaultAddress,
        string[] memory _symbols,
        address[] memory _assetERC20address,
        address[] memory pricefeeds
    ) {
        /*
            basic constructor
        */
        masterSymbols = _symbols;
        assetAddress = _assetERC20address;
        denominatedAsset = masterSymbols[0];
        masterWeight = 0;
        vault_address = _vaultAddress;
        for (uint256 i = 0; i < masterSymbols.length; i++) {
            symbolPricefeed[masterSymbols[i]] = AggregatorV3Interface(
                pricefeeds[i]
            );
            masterSignal.push(int256(0));
            nullSignal.push(int256(0));
        }
    }

    function addAsset(
        string memory symbol,
        address tokenAddress,
        address priceFeed
    ) external {
        masterSymbols.push(symbol);
        symbolPricefeed[symbol] = AggregatorV3Interface(priceFeed);
        assetAddress.push(tokenAddress);
        revert("should not use");
        // TODO
    }

    function submitSignal(string[] memory symbol, int256[] memory weight)
        external
    {
        /*
            recieve signal from strategist 
            - normalise the signal
            - remove previous signal from master
            - add new signal to the master
            - update the rest

            TODO: chage format and keep record; 
        */
        if (userWeight[msg.sender] > 0) {
            _withdrawSignal(msg.sender);
        }
        if (userWeight[msg.sender] == 0) {
            userWeight[msg.sender] = ONE;
        }

        int256[] memory tmpSignal =
            XPNUtils.checkAndPadSymbol(masterSymbols, symbol, weight);
        tmpSignal = tmpSignal.normalize();
        tmpSignal = tmpSignal.vectorScale(userWeight[msg.sender]);

        masterSignal = masterSignal.elementWiseAdd(tmpSignal);
        masterWeight += userWeight[msg.sender];
        userSignal[msg.sender] = tmpSignal;
    }

    function _withdrawSignal(address targetAddress) internal {
        /*
            remove signal from target address from master signal
        */
        masterSignal = masterSignal.elementWiseSub(userSignal[targetAddress]);
        masterWeight -= userWeight[targetAddress];
        userWeight[targetAddress] = 0;
        userSignal[targetAddress] = nullSignal;
    }

    function withdrawSignal() external {
        /*
            remove caller's signal
        */
        _withdrawSignal(msg.sender);
    }

    function getUserWeight() external view returns (int256) {
        /*
            get user weight
        */
        return userWeight[msg.sender];
    }

    function getUserSignal() external view returns (int256[] memory) {
        /*
            get user weight
        */
        return userSignal[msg.sender];
    }

    function getMasterSignal() external view returns (int256[] memory) {
        /*
            get user weight
        */
        return masterSignal.normalize();
    }

    function _viewPortfolioToken()
        public
        view
        virtual
        returns (int256[] memory)
    {
        /*
        return amount of each asset. (in token)
        TODO: refactor 
        */
        revert("not implemented");
    }

    function _getTokensPrice() public view virtual returns (int256[] memory) {
        /*
            token prices
        */
        int256[] memory prices = new int256[](masterSymbols.length);
        for (uint256 i = 0; i < masterSymbols.length; i++) {
            prices[i] = XPNUtils.LatestPrice(symbolPricefeed[masterSymbols[i]]);
        }
        return prices;
    }

    function _viewPortfolioMixValue() public view returns (int256[] memory) {
        /*
        return value of each asset. (in usd) 
        TODO: refactor 
        */
        return _viewPortfolioToken().elementWiseMul(_getTokensPrice());
    }

    function _viewPortfolioAllocation() public view returns (int256[] memory) {
        /*
        return allocation of each asset. (in % of portfolio) - sum = 1e18
        */
        return _viewPortfolioMixValue().normalize();
    }

    function signalPortfolioDiffAllovcation()
        public
        view
        returns (int256[] memory)
    {
        /*
            get different in % allocation between master signal and current portfolio allocation
        */
        return
            masterSignal.normalize().elementWiseSub(_viewPortfolioAllocation());
    }

    function _signalPortfolioDiffValue() public view returns (int256[] memory) {
        /*
            get different in value allocation between master signal and current portfolio allocation
            TODO: refactor
        */
        return signalPortfolioDiffAllovcation().vectorScale(_portfolioValue());
    }

    function _signalPortfolioDiffToken() public view returns (int256[] memory) {
        /*
            get different in token allocation between master signal and current portfolio allocation
            TODO: implement this
        */
        return _signalPortfolioDiffValue().elementWiseDiv(_getTokensPrice());
    }

    function _portfolioValue() public view returns (int256 value) {
        /*
            porfolio value in usd
        */
        value = _viewPortfolioMixValue().sum();
    }

    function _signalPortfolioDiffPercent()
        public
        view
        returns (int256 distance)
    {
        /*
        distance between target vs current portfolio_allocation (how much value needed to be move) (in %)
        calculate as sum(token-wise diff)/ 2
        */
        distance = signalPortfolioDiffAllovcation().l1Norm() / 2;
    }
}
