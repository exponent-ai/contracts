// SPDX-License-Identifier: Unlicense
pragma solidity >=0.6.0;

import "../XPNSettlement.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

interface IXPN is IAccessControlEnumerable {
    function deposit(uint256) external returns (uint256);

    function withdraw(uint256)
        external
        returns (address[] memory, uint256[] memory);

    function submitTrustedTradeOrders(
        bytes[] calldata _trades,
        address[] memory _venues
    ) external returns (bool);

    function submitTrustedPoolOrders(
        bytes[] calldata _orders,
        XPNSettlement.Pool[] calldata _txTypes,
        address[] memory _venues
    ) external returns (bool);

    function submitTradeOrders(
        bytes[] calldata _trades,
        address[] memory _venues
    ) external returns (bool);

    function submitPoolOrders(
        bytes[] calldata _orders,
        XPNSettlement.Pool[] calldata _txTypes,
        address[] memory _venues
    ) external returns (bool);

    function getSignalPool() external view returns (address);

    function getSignalName() external view returns (string memory);

    function getLPTokenAddress() external view returns (address);

    function getDenominationAsset() external view returns (address);
}
