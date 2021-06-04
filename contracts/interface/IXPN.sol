// SPDX-License-Identifier: Unlicense
pragma solidity >=0.6.0;

interface IXPN {
    function deposit(uint256) external returns (uint256);

    function withdraw(uint256)
        external
        returns (address[] memory, uint256[] memory);

    function submitTradeOrders(
        bytes[] calldata _trades,
        address[] memory _venues
    ) external returns (bool);

    function calcGav(bool) external returns (uint256, bool);

    function calcGrossLPValue(bool) external returns (uint256, bool);

    function getTrackedAssets() external view returns (address[] memory);

    function getStrategistAddress() external view returns (address);

    function getAdminAddress() external view returns (address);

    function getLPTokenAddress() external view returns (address);

    function getDenominationAsset() external view returns (address);
}
