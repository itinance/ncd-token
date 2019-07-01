pragma solidity ^0.5.7;

import "../NCDToken.sol";

contract NCDTokenImpl is NCDToken {
    constructor(address owner, address[] memory pausers) public {
        super.initialize(owner, pausers);
    }
}
