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
    address private vaultAddress;
    address[] assetAddress;
    mapping(string => AggregatorV3Interface) symbolPricefeed;
    int256 expectedEfficientcy = 98e16;

    ISignal private signalPool;
    string signalName;

    constructor() {}

    // @notice set target signal
    // @param _signalPoolAddress address of signal contract
    // @param _signalName name of the target signal in the signal contract
    // @dev this function assume that caller already verify the compatability off chain.
    function setSignal(address _signalPoolAddress, string memory _signalName)
        internal
    {
        signalPool = ISignal(_signalPoolAddress);

        // "This asset vault is consistence with the signal asset"
        require(true);

        signalName = _signalName;
    }

    function setVaultAddress(address _vaultAddress) external {
        vaultAddress = _vaultAddress;
    }

    function viewPortfolioToken()
        public
        view
        virtual
        returns (int256[] memory)
    {
        /*
        return amount of each asset. (in token)
        TODO: refactor 
        */
        int256[] memory tokens = new int256[](assetAddress.length);
        for (uint256 i = 0; i < assetAddress.length; i++) {
            tokens[i] = int256(IERC20(assetAddress[i]).balanceOf(vaultAddress));
        }
        return tokens;
    }

    function getTokensPrice() public view virtual returns (int256[] memory) {
        /*
            token prices
        */
    }

    function viewPortfolioMixValue() public view returns (int256[] memory) {
        /*
            return value of each asset. (in usd) 
            TODO: refactor 
            */
        return viewPortfolioToken().elementWiseMul(getTokensPrice());
    }

    function viewPortfolioAllocation() public view returns (int256[] memory) {
        /*
            return allocation of each asset. (in % of portfolio) - sum = 1e18
            */
        return viewPortfolioMixValue().normalize();
    }

    function signalPortfolioDiffAllocation()
        public
        view
        returns (int256[] memory)
    {
        /*
            get different in % allocation between master signal and current portfolio allocation
        */
        return
            signalPool.getSignal(signalName).normalize().elementWiseSub(
                viewPortfolioAllocation()
            );
    }

    function signalPortfolioDiffValue() public view returns (int256[] memory) {
        /*
            get different in value allocation between master signal and current portfolio allocation
            TODO: refactor
        */
        return signalPortfolioDiffAllocation().vectorScale(portfolioValue());
    }

    function signalPortfolioDiffToken() public view returns (int256[] memory) {
        /*
            get different in token allocation between master signal and current portfolio allocation
            TODO: implement this
        */
        return signalPortfolioDiffValue().elementWiseDiv(getTokensPrice());
    }

    function portfolioValue() public view virtual returns (int256 value) {
        /*
            porfolio value in usd
        */
        value = viewPortfolioMixValue().sum();
    }

    function signalPortfolioDiffPercent()
        public
        view
        virtual
        returns (int256 distance)
    {
        /*
        distance between target vs current portfolio_allocation (how much value needed to be move) (in %)
        calculate as sum(token-wise diff)/ 2
        */
        distance = signalPortfolioDiffAllocation().l1Norm() / 2;
    }

    modifier ensureTrade() {
        // TODO
        int256 preTradeValue = portfolioValue();
        int256 preTradeDistance = signalPortfolioDiffPercent();
        _;
        int256 distanceImproved =
            preTradeDistance - signalPortfolioDiffPercent();
        int256 valueLoss = preTradeValue - portfolioValue();
        int256 expectedLoss =
            (((preTradeValue * distanceImproved) / ONE) *
                (ONE - expectedEfficientcy)) / ONE;

        require(
            distanceImproved > 0 && valueLoss < expectedLoss,
            "trade requirement not satisfy"
        );
    }
}
