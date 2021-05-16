//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../XPNVault.sol";
import "../mocks/MockERC20.sol";

contract XPNVaultSpy is XPNVault {
    bool public depositHookCalled;
    bool public withdrawHookCalled;
    bool public redeemFeesCalled;
    uint256 public amountToMint;
    uint256 public amountToWithdraw;
    uint256 public sharesToRedeem;
    address public admin;
    address public shares;
    MockERC20 public mockDenomAsset;

    constructor(
        address _admin,
        address _denomAsset,
        address _shares,
        string memory _lpname,
        string memory _lpsymbol
    ) XPNVault(_denomAsset, _lpname, _lpsymbol) {
        shares = _shares;
        admin = _admin;
        mockDenomAsset = MockERC20(_denomAsset);
    }

    function setAmountToWithdraw(uint256 _amount) public {
        amountToWithdraw = _amount;
    }

    function setAmountToMint(uint256 _amount) public {
        amountToMint = _amount;
    }

    function setSharesToRedeem(uint256 _amount) public {
        sharesToRedeem = _amount;
    }

    function deposit(uint256 _amount) external returns (uint256) {
        return _deposit(_amount);
    }

    function redeemFees(address _feeManager, address[] calldata _fees)
        external
        returns (address[] memory payoutAssets, uint256[] memory payoutAmounts)
    {
        mockDenomAsset.mintTo(shares, amountToWithdraw); // simulate denominated asset collected
        return _redeemFees(_feeManager, _fees);
    }

    function _depositHook(uint256) internal override returns (uint256) {
        depositHookCalled = true;
        mockDenomAsset.mintTo(shares, amountToMint);
        return amountToMint;
    }

    function withdraw(uint256 _amount)
        external
        returns (address[] memory payoutAssets, uint256[] memory payoutAmounts)
    {
        return _withdraw(_amount);
    }

    function _withdrawHook(uint256)
        internal
        override
        returns (address[] memory, uint256[] memory)
    {
        withdrawHookCalled = true;
        address[] memory assets = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        assets[0] = address(denomAsset);
        amounts[0] = amountToWithdraw;
        return (assets, amounts);
    }

    function _getSharesAddress() internal view override returns (address) {
        return shares;
    }

    function _getAdminAddress() internal view override returns (address) {
        return admin;
    }

    function _redeemFeesHook(address, address[] memory) internal override {
        MockERC20(shares).mintTo(address(this), sharesToRedeem);
        redeemFeesCalled = true;
    }
}
