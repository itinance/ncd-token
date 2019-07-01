pragma solidity ^0.5.7;

import "../TokenVesting.sol";

contract TokenVestingImpl is TokenVesting {

    constructor(address beneficiary, uint256 start, uint256 cliffDuration, uint256 periodLength, uint256 periodRate, address owner, address updaterRole) public {
        super.initialize(beneficiary, start, cliffDuration, periodLength, periodRate, owner, updaterRole);
    }
}
