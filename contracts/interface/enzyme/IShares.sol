//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/*@notice Enzyme Vault interface, Vault and ERC20 Shares is the same contract*/
interface IShares is IERC20 {
    function getOwner() external view returns (address);

    function isTrackedAsset(address) external view returns (bool);

    function getTrackedAssets() external view returns (address[] memory);
}
