pragma solidity ^0.8.0;

import "./interface/ISignal.sol";

contract XPNSignal is ISignal {
    struct signalMetaData {
        string signalType;
        bool signalExist;
        bool signalActive;
    }
    mapping(address => mapping(string => bool)) ownSignals;
    mapping(string => int256[]) signalsWeight;
    mapping(string => string[]) signalsReference;
    mapping(string => signalMetaData) signalsMetaData;

    address[] assetAddress;

    function registerSignal(
        string memory signalName,
        string memory _signalType,
        string[] memory symbols
    ) external override returns (string memory) {
        if (signalsMetaData[signalName].signalExist) {
            revert("signal already exist");
        }
        ownSignals[msg.sender][signalName] = true;
        signalsMetaData[signalName] = signalMetaData({
            signalType: _signalType,
            signalExist: true,
            signalActive: false
        });
    }

    function withdrawSignal(string memory signalName) external override {
        require(ownSignals[msg.sender][signalName], "not your signal");
        signalsMetaData[signalName].signalActive = false;
    }

    function submitSignal(
        string memory signalName,
        string[] memory ref,
        int256[] memory weights,
        bytes calldata data
    ) external override {
        require(ownSignals[msg.sender][signalName], "not your signal");
        signalsWeight[signalName] = weights;
        signalsReference[signalName] = ref;
        signalsMetaData[signalName].signalActive = true;
    }

    function updateSignal(string memory signalName) external override {
        revert("this signal do not require any update");
    }

    function getSignalMeta(string memory signalName)
        external
        view
        override
        returns (string[] memory)
    {
        require(
            signalsMetaData[signalName].signalActive,
            "signal not available"
        );
        return signalsReference[signalName];
    }

    function getSignal(string memory signalName)
        external
        view
        override
        returns (int256[] memory)
    {
        require(
            signalsMetaData[signalName].signalActive,
            "signal not available"
        );

        return signalsWeight[signalName];
    }

    function getMetaData() external pure override returns (string memory) {
        return "nothing yet";
    }
}
