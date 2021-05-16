// SPDX-License-Identifier: Unlicense
pragma solidity >=0.6.0;

interface IXPN {
    function deposit(uint256) external returns (uint256);

    function withdraw(uint256)
        external
        returns (address[] memory, uint256[] memory);

    function submitSignal(string[] memory, int256[] memory) external;

    function submitTradeOrders(
        bytes[] calldata _trades,
        address[] memory _venues
    ) external returns (bool);

    function calcGav(bool) external returns (uint256, bool);

    function calcGrossLPValue(bool) external returns (uint256, bool);

    function getTrackedAssets() external view returns (address[] memory);

    function getStrategist() external view returns (address);

    function getAdmin() external view returns (address);

    function getLPToken() external view returns (address);

    function getDenominationAsset() external view returns (address);
}
