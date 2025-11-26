// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DICE Token
 * @notice ERC20 token for SicBo game
 * @dev Simple ERC20 token with minting capability for initial distribution
 */
contract DICE is ERC20, Ownable {
    uint8 private constant _DECIMALS = 18;

    constructor(address initialOwner) ERC20("DICE Token", "DICE") Ownable(initialOwner) {
        // Mint initial supply to owner (1 billion tokens)
        uint256 initialSupply = 1_000_000_000 * 10 ** _DECIMALS;
        _mint(initialOwner, initialSupply);
    }

    /**
     * @dev Returns the number of decimals used to get its user representation.
     */
    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }

    /**
     * @notice Mint new tokens (only owner)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}

