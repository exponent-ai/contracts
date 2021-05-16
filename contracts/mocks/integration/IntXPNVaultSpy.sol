//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../../interface/enzyme/IFundDeployer.sol";
import "../../interface/enzyme/IComptroller.sol";
import "../../interface/enzyme/IShares.sol";
import "../../XPNVault.sol";
import "hardhat/console.sol";

contract SpyIntXPNVault is XPNVault {
    using SafeERC20 for IERC20;

    IComptroller public controller;
    IFundDeployer public deployer;
    IERC20 public shares;
    address public integrationManager;
    address public assetTrackedAdapter;
    address public admin;

    constructor(
        address _admin,
        address _deployer,
        address _denomAsset,
        address _integrationManager,
        address _trackedAdapter,
        string memory _name,
        string memory _symbol,
        bytes memory _feeConfig
    ) XPNVault(_denomAsset, _name, _symbol) {
        deployer = IFundDeployer(_deployer);
        integrationManager = _integrationManager;
        assetTrackedAdapter = _trackedAdapter;
        (address controllerAddress, address sharesAddress) =
            deployer.createNewFund(
                address(this),
                "XPN-Vault",
                address(denomAsset),
                1,
                _feeConfig,
                ""
            );
        controller = IComptroller(controllerAddress);
        shares = IERC20(sharesAddress);
        admin = _admin;
    }

    function addTrackedAsset(address _asset) external {
        uint256 actionID = 1;
        address[] memory assets = new address[](1);
        assets[0] = _asset;
        bytes memory addTrackedArgs = abi.encode(assets);
        controller.callOnExtension(
            integrationManager,
            actionID,
            addTrackedArgs
        );
    }

    function deposit(uint256 _amount) external returns (uint256) {
        return _deposit(_amount);
    }

    function _depositHook(uint256 _amount) internal override returns (uint256) {
        denomAsset.approve(address(controller), _amount);
        address[] memory buyers = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        buyers[0] = address(this);
        amounts[0] = _amount;
        uint256[] memory sharesBought =
            controller.buyShares(buyers, amounts, amounts);
        return sharesBought[0]; // should have bought only a single share
    }

    function withdraw(uint256 _amount)
        external
        returns (address[] memory payoutAssets, uint256[] memory payoutAmounts)
    {
        return _withdraw(_amount);
    }

    function _withdrawHook(uint256 _amount)
        internal
        override
        returns (address[] memory, uint256[] memory)
    {
        address[] memory additionalAssets = new address[](0);
        address[] memory assetsToSkip = new address[](0);
        return
            controller.redeemSharesDetailed(
                _amount,
                additionalAssets,
                assetsToSkip
            );
    }

    function _getSharesAddress() internal view override returns (address) {
        return address(shares);
    }

    function _getAdminAddress() internal view override returns (address) {
        return admin;
    }

    function redeemFees(address _feeManager, address[] calldata _fees)
        external
        returns (address[] memory payoutAssets, uint256[] memory payoutAmounts)
    {
        return _redeemFees(_feeManager, _fees);
    }

    function _redeemFeesHook(address _feeManager, address[] memory _fees)
        internal
        override
    {
        controller.callOnExtension(_feeManager, 0, "");
        controller.callOnExtension(_feeManager, 1, abi.encode(_fees));
    }
}
