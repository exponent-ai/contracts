//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    bool returnFalse;
    bool returnAmountSet;
    uint256 returnAmount;

    constructor(string memory _name, string memory _symbol)
        ERC20(_name, _symbol)
    {}

    function mint(uint256 _amount) public {
        _mint(msg.sender, _amount);
    }

    function mintTo(address _to, uint256 _amount) public {
        _mint(_to, _amount);
    }

    function setReturnToFalse() public {
        returnFalse = true;
    }

    function setReturnAmount(uint256 _amount) public {
        returnAmountSet = true;
        returnAmount = _amount;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public override returns (bool) {
        if (returnFalse) {
            return false;
        } else {
            return
                returnAmountSet
                    ? super.transferFrom(sender, recipient, returnAmount)
                    : super.transferFrom(sender, recipient, amount);
        }
    }

    function transfer(address sender, uint256 amount)
        public
        override
        returns (bool)
    {
        return returnFalse ? false : super.transfer(sender, amount);
    }
}
