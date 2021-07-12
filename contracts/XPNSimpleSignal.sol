// Copyright (C) 2021 Exponent

// This file is part of Exponent.
    
// Exponent is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Exponent is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Exponent.  If not, see <http://www.gnu.org/licenses/>.

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
