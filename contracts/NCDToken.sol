pragma solidity ^0.5.7;

import "openzeppelin-eth/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-eth/contracts/token/ERC20/ERC20Mintable.sol";
import "openzeppelin-eth/contracts/token/ERC20/ERC20Pausable.sol";

contract NCDToken is ERC20Detailed, ERC20Mintable, ERC20Pausable {

    function initialize(
        address minter,
        address[] memory pausers
    ) public initializer {

        require(pausers[0] != address(0));

        ERC20Detailed.initialize("NCDToken", "NCD", uint8(18));
        ERC20Mintable.initialize(minter);

        ERC20Pausable.initialize(pausers[0]);

        // add the other pausers as well if existing
        for (uint256 i = 1; i < pausers.length; ++i) {
            _addPauser(pausers[i]);
        }
    }

    function () external payable {
        revert('Sending Ether directly is not allowed.');
    }

    /**
     * @dev Minting tokens
     * @param account The account of beneficiary who will get the minted token
     * @param value The amount of minted token
     */
    function _mint(address account, uint256 value) internal whenNotPaused onlyMinter {
        super._mint(account, value);
    }


}