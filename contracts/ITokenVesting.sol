pragma solidity ^0.5.2;

import "zos-lib/contracts/Initializable.sol";
import "openzeppelin-eth/contracts/ownership/Ownable.sol";
import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-eth/contracts/token/ERC20/SafeERC20.sol";

/**
 * @title TokenVesting
 * @dev A token holder contract that can release its token balance gradually like a
 * typical vesting scheme, with a cliff and vesting period. Optionally revocable by the
 * owner.
 */
interface ITokenVesting {

    /**
     * @return the beneficiary of the tokens.
     */
    function beneficiary() external view returns (address);

    /**
     * @dev Update beneficiary
     */
    function updateBeneficiary(address newBeneficiary) external;

    /**
     * @return the cliff time of the token vesting.
     */
    function cliff() external view returns (uint256);

    /**
     * @return the start time of the token vesting.
     */
    function start() external view returns (uint256);

    function periodLength() external view returns (uint256);

    function periodRate() external view returns (uint256);

    /**
     * @return the amount of the token released.
     */
    function released(address token) external view returns (uint256);

    function release(IERC20 token) external;

    function totalBalance(IERC20 token) external view returns (uint256);

    /**
     * @dev Calculates the amount that has already vested.
     * @param token ERC20 token which is being vested
     */
    function vestedAmount(IERC20 token) external view returns (uint256);
}
