pragma solidity ^0.5.2;

import "zos-lib/contracts/Initializable.sol";
import "openzeppelin-eth/contracts/ownership/Ownable.sol";
import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-eth/contracts/token/ERC20/SafeERC20.sol";

//import "./ITokenVesting.sol";

/**
 * @title TokenVesting
 * @dev A token holder contract that can release its token balance gradually like a
 * typical vesting scheme, with a cliff and vesting period. Optionally revocable by the
 * owner.
 */
contract TokenVesting is Initializable, Ownable  {
    // The vesting schedule is time-based (i.e. using block timestamps as opposed to e.g. block numbers), and is
    // therefore sensitive to timestamp manipulation (which is something miners can do, to a certain degree). Therefore,
    // it is recommended to avoid using short time durations (less than a minute). Typical vesting schemes, with a
    // cliff period of a year and a duration of four years, are safe to use.
    // solhint-disable not-rely-on-time

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    event TokensReleased(address token, uint256 amount);

    event BeneficiaryUpdate(address beneficiary, address oldBeneficiary);

    // beneficiary of tokens after they are released
    address private _beneficiary;

    uint256 private constant MATH_PRECISION = 10;

    // Durations and timestamps are expressed in UNIX time, the same units as block.timestamp.
    uint256 private _cliff;
    uint256 private _start;
    uint256 private _periodLength;
    uint256 private _periodRate;

    mapping (address => uint256) private _released;
    mapping (address => bool) private _revoked;

    /**
     * @dev Creates a vesting contract that vests its balance of any ERC20 token to the
     * beneficiary, gradually in a linear fashion until start + duration. By then all
     * of the balance will have vested.
     * @param beneficiary address of the beneficiary to whom vested tokens are transferred
     * @param cliffDuration duration in seconds of the cliff in which tokens will begin to vest
     * @param start the time (as Unix time) at which point vesting starts
     * @param owner The owner
     */
    function initialize(address beneficiary, uint256 start, uint256 cliffDuration, uint256 periodLength, uint256 periodRate, address owner) public initializer {
        Ownable.initialize(owner);

        require(beneficiary != address(0), "TokenVesting: beneficiary is zero address");
        require(cliffDuration > 0, "TokenVesting: cliff must be > 0" );
        require(periodLength > 0, "TokenVesting: periodLength must be > 0");
        require(periodRate > 0, "TokenVesting: periodRate must be > 0");
        require(start.add(cliffDuration) > block.timestamp, "TokenVesting: end of cliff period must be in future");

        _beneficiary = beneficiary;
        _periodLength = periodLength;
        _periodRate = periodRate;

        _cliff = start.add(cliffDuration);
        _start = start;
    }

    /**
     * @return the beneficiary of the tokens.
     */
    function beneficiary() public view returns (address) {
        return _beneficiary;
    }

    /**
     * @dev Update beneficiary
     */
    function updateBeneficiary(address newBeneficiary) public onlyOwner {
        address oldBeneficiary = _beneficiary;
        _beneficiary = newBeneficiary;
        emit BeneficiaryUpdate(_beneficiary, oldBeneficiary);
    }

    /**
     * @return the cliff time of the token vesting.
     */
    function cliff() public view returns (uint256) {
        return _cliff;
    }

    /**
     * @return the start time of the token vesting.
     */
    function start() public view returns (uint256) {
        return _start;
    }

    function periodLength() public view returns (uint256) {
        return _periodLength;
    }

    function periodRate() public view returns (uint256) {
        return _periodRate;
    }

    /**
     * @return the amount of the token released.
     */
    function released(address token) public view returns (uint256) {
        return _released[token];
    }

    /**
     * @notice Transfers vested tokens to beneficiary.
     * @param token ERC20 token which is being vested
     */
    function release(IERC20 token) public {
        uint256 unreleased = _releasableAmount(token);

        require(unreleased > 0, "TokenVesting: there are no token available to release yet");

        _released[address(token)] = _released[address(token)].add(unreleased);

        token.safeTransfer(_beneficiary, unreleased);

        emit TokensReleased(address(token), unreleased);
    }

    /**
     * @dev Calculates the amount that has already vested but hasn't been released yet.
     * @param token ERC20 token which is being vested
     */
    function _releasableAmount(IERC20 token) private view returns (uint256) {
        return vestedAmount(token).sub(_released[address(token)]);
    }

    function totalBalance(IERC20 token) public view returns (uint256) {
        uint256 currentBalance = token.balanceOf(address(this));
        return currentBalance.add(_released[address(token)]);
    }

    /**
     * @dev Calculates the amount that has already vested.
     * @param token ERC20 token which is being vested
     */
    function vestedAmount(IERC20 token) public view returns (uint256) {
        if (block.timestamp < _cliff) {
            return 0;
        }

        uint256 _totalBalance = totalBalance(token);
        uint256 secondsSinceCliff = block.timestamp.sub(_cliff);

        uint256 percentInPeriod = secondsSinceCliff.mul(10**MATH_PRECISION).div(_periodLength).div(_periodRate);
        return _totalBalance.mul(percentInPeriod).div(10**MATH_PRECISION);
    }

    uint256[50] private ______gap;
}
