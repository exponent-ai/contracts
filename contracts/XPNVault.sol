//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./LPToken.sol";
import "hardhat/console.sol";

// @title core application logic for vault
// @notice to be inherited by the implementation contract for added functionality
// @dev deposit/ withdraw hooks and calculation must be overridden
contract XPNVault is ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    //TODO denomAsset state should be hydrated by the inheriter
    IERC20 public denomAsset;
    LPToken public lptoken;

    event Deposit(address indexed _depositor, uint256 _amount);
    event Withdraw(
        address indexed _withdrawer,
        address[] _payoutAssets,
        uint256[] _payoutAmount
    );

    constructor(
        address _denomAsset,
        string memory _lpname,
        string memory _lpsymbol
    ) {
        denomAsset = IERC20(_denomAsset);
        lptoken = new LPToken(_lpname, _lpsymbol);
    }

    // @notice deposit denominated asset into the contract
    // @param _amount amount to be deposited
    // @dev denominated asset must be approved first
    // @return amount of LP tokens minted
    function _deposit(uint256 _amount)
        internal
        nonReentrant
        returns (uint256 minted)
    {
        require(_amount > 0, "Vault: _amount cant be zero");
        uint256 before = denomAsset.balanceOf(_getSharesAddress());
        require(
            denomAsset.balanceOf(msg.sender) >= _amount,
            "Vault: not enough balance to deposit"
        );
        bool res = denomAsset.transferFrom(msg.sender, address(this), _amount);
        if (res) {
            minted = _depositHook(_amount);
        } else {
            revert("Vault: unsuccessful deposit");
        }
        require(
            denomAsset.balanceOf(_getSharesAddress()) >= before.add(_amount),
            "Vault: incorrect balance after deposit"
        );
        lptoken.mint(msg.sender, minted);
        emit Deposit(msg.sender, _amount);
    }

    // @notice redeem LP token share for denominated asset
    // @notice currently withdraw basket of tokens to user
    // @param _amount amount of LP token to be redeemed
    // @dev LP token must be approved first
    // @return assets and amount of to be withdrawn
    function _withdraw(uint256 _amount)
        internal
        nonReentrant
        returns (address[] memory payoutAssets, uint256[] memory payoutAmounts)
    {
        require(_amount > 0, "Vault: _amount cant be zero");
        require(
            lptoken.balanceOf(msg.sender) >= _amount,
            "Vault: not enough lptoken to withdrwal"
        );
        lptoken.burn(msg.sender, _amount); // burn user's lp balance without intermediate transferFrom
        (payoutAssets, payoutAmounts) = _withdrawHook(_amount);
        bool result = _doWithdraw(msg.sender, payoutAssets, payoutAmounts);
        require(result, "Vault: unsuccessful transfer to withdrawer");
    }

    function _redeemFees(address _feeManager, address[] calldata _fees)
        internal
        returns (address[] memory payoutAssets, uint256[] memory payoutAmounts)
    {
        _redeemFeesHook(_feeManager, _fees);
        address shares = _getSharesAddress();
        uint256 collectedFees =
            IERC20(shares).totalSupply() - lptoken.totalSupply();
        require(collectedFees > 0, "_redeemFees: no fee shares available");
        (payoutAssets, payoutAmounts) = _withdrawHook(collectedFees);
        bool result =
            _doWithdraw(_getAdminAddress(), payoutAssets, payoutAmounts);
        require(result, "Vault: unsuccessful redemption");
    }

    function _doWithdraw(
        address recipient,
        address[] memory payoutAssets,
        uint256[] memory payoutAmounts
    ) private returns (bool) {
        for (uint8 i = 0; i < payoutAssets.length; i++) {
            //TODO there are two ERC20 transfers for every assets, here and in Enzyme, find ways to optimize
            bool res =
                IERC20(payoutAssets[i]).transfer(recipient, payoutAmounts[i]);
            if (!res) return false;
        }
        // won't verify that that payout assets is calculated correctly due to gas cost of handling multiple payouts
        emit Withdraw(recipient, payoutAssets, payoutAmounts);
        return true;
    }

    // @notice internal functions to be overriden by implementor contracts
    // @dev can modify inputs and outputs as needed
    function _depositHook(uint256 _amount) internal virtual returns (uint256) {}

    function _getSharesAddress() internal virtual returns (address) {}

    function _getAdminAddress() internal virtual returns (address) {}

    function _withdrawHook(uint256 _amount)
        internal
        virtual
        returns (address[] memory, uint256[] memory)
    {}

    function _redeemFeesHook(address _feeManager, address[] memory _fees)
        internal
        virtual
    {}
}
