//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LPToken is ERC20, Ownable {
    constructor(string memory _name, string memory _symbol)
        ERC20(_name, _symbol)
    {}

    // @notice mint LP token share
    // @param receiver the address to receive the tokens
    // @param amount the amount of tokens to mint
    // @dev callable only by deployer
    function mint(address receiver, uint256 amount) public onlyOwner {
        _mint(receiver, amount);
    }

    // @notice burn LP token share
    // @param wallet the wallet to burn tokens from
    // @param amount the amount of tokens to be burned
    // @dev callable only by deployer
    function burn(address wallet, uint256 amount) public onlyOwner {
        _burn(wallet, amount);
    }
}
