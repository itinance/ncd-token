pragma solidity ^0.5.7;

import "../NCDTokenSale.sol";

contract NCDTokenSaleImpl is NCDTokenSale {
    constructor(uint256 openingTime, uint256 closingTime, NCDToken token) public {
        super.initialize(openingTime, closingTime, token);
    }
}
