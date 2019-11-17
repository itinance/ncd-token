pragma solidity ^0.5.2;

import "zos-lib/contracts/Initializable.sol";
import "openzeppelin-eth/contracts/ownership/Ownable.sol";
import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-eth/contracts/token/ERC20/SafeERC20.sol";

import "./ITokenVesting.sol";

/**
 * @title TokenVesting
 * @dev A token holder contract that can release its token balance gradually like a
 * typical vesting scheme, with a cliff and vesting period. Optionally revocable by the
 * owner.
 */
contract TokenVesting is Initializable, Ownable, ITokenVesting {
    // The vesting schedule is time-based (i.e. using block timestamps as opposed to e.g. block numbers), and is
    // therefore sensitive to timestamp manipulation (which is something miners can do, to a certain degree). Therefore,
    // it is recommended to avoid using short time durations (less than a minute). Typical vesting schemes, with a
    // cliff period of a year and a duration of four years, are safe to use.
    // solhint-disable not-rely-on-time

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /**
     * @dev This event gets dispatched when tokens get released out of this contract
     */
    event TokensReleased(address token, uint256 amount);

    /**
     * @dev This event will be dispatched after the beneficiary was updated (e.g. a new custody provider)
     */
    event BeneficiaryUpdate(address beneficiary, address oldBeneficiary);

    event CliffUpdate(uint256 oldCliff, uint256 newCliff);

    event PeriodLengthUpdate(uint256 oldValue, uint256 periodLength);
    event PeriodRateUpdate(uint256 oldValue, uint256 periodRate);

    // beneficiary of tokens after they are released
    address private _beneficiary;

    /**
     * @dev precision that is used to do proper division of a integer
     */
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
     *
     * An zero address for beneficiary is allowed in order to deploy this contract without any.
     * However, no release will happen until a valid address was set with `updateBeneficiary`
     *
     * @param beneficiary address of the beneficiary to whom vested tokens are transferred. Can be zero at time of creation
     * @param cliffDuration duration in seconds of the cliff in which tokens will begin to vest
     * @param start the time (as Unix time) at which point vesting starts
     * @param owner The owner
     */
    function initialize(address beneficiary, uint256 start, uint256 cliffDuration, uint256 periodLength, uint256 periodRate, address owner) public initializer {
        Ownable.initialize(owner);

        require(cliffDuration > 0, "TokenVesting: cliff must be > 0" );
        require(periodLength > 0, "TokenVesting: periodLength must be > 0");
        require(periodRate > 0, "TokenVesting: periodRate must be > 0");
        //require(start.add(cliffDuration) > block.timestamp, "TokenVesting: end of cliff period must be in future");

        _beneficiary = beneficiary;
        _periodLength = periodLength;
        _periodRate = periodRate;

        _cliff = start.add(cliffDuration);
        _start = start;
    }

    /**
     * @return the beneficiary of the tokens.
     */
    function beneficiary() external view returns (address) {
        return _beneficiary;
    }

    /**
     * @dev Update beneficiary
     */
    function updateBeneficiary(address newBeneficiary) external onlyOwner {
        address oldBeneficiary = _beneficiary;
        _beneficiary = newBeneficiary;
        emit BeneficiaryUpdate(_beneficiary, oldBeneficiary);
    }

    /**
     * @return the cliff time of the token vesting. As long as cliff period is not over, no tokens can get transfered
     */
    function cliff() external view returns (uint256) {
        return _cliff;
    }

    function updateCliff(uint256 newCliff) external onlyOwner {
        require(_cliff > _start, "Cliff must be higher than start");

        uint256 oldValue = _cliff;
        _cliff = newCliff;

        emit CliffUpdate(oldValue, _cliff);
    }

    /**
     * @return the start time of the token vesting.
     */
    function start() external view returns (uint256) {
        return _start;
    }

    /**
     * @return The length of a period in seconds, in which a possible rate as maximum can be transfered out of this contract
     */
    function periodLength() external view returns (uint256) {
        return _periodLength;
    }

    function updatePeriodLength(uint256 _newLength) external onlyOwner {
        require(_newLength > 0);

        uint256 oldValue = _periodLength;
        _periodLength = _newLength;

        emit PeriodLengthUpdate(oldValue, _newLength);
    }

    function updatePeriodRate(uint256 _newRate) external onlyOwner {
        require(_newRate > 0);

        uint256 oldValue = _periodRate;
        _periodRate = _newRate;

        emit PeriodLengthUpdate(oldValue, _newRate);
    }

    /**
     * @return The rate in absolute percent, which can be transfered out of the contract in a specific period
     */
    function periodRate() external view returns (uint256) {
        return _periodRate;
    }

    /**
     * @return the amount of the token released.
     */
    function released(address token) external view returns (uint256) {
        return _released[token];
    }

    /**
     * @notice Transfers vested tokens to beneficiary.
     * @param token ERC20 token which is being vested
     */
    function release(IERC20 token) external {
        require(_beneficiary != address(0), "TokenVesting: beneficiary is zero address");

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
        return _vestedAmount(token).sub(_released[address(token)]);
    }

    /**
     * @return Returns the total balance of this vesting contract for a specific token
     */
    function totalBalance(IERC20 token) external view returns (uint256) {
        return _totalBalance(token);
    }

    function _totalBalance(IERC20 token) internal view returns (uint256) {
        uint256 currentBalance = token.balanceOf(address(this));
        return currentBalance.add(_released[address(token)]);
    }

    /**
     * @dev Calculates the amount that has already vested.
     * @param token ERC20 token which is being vested
     */
    function vestedAmount(IERC20 token) external view returns (uint256) {
        return _vestedAmount(token);
    }

    /**
     * @dev Calculates the amount that has already vested.
     * @param token ERC20 token which is being vested
     */
    function _vestedAmount(IERC20 token) internal view returns (uint256) {
        if (block.timestamp < _cliff) {
            return 0;
        }

        uint256 currentBalance = token.balanceOf(address(this));
        uint256 balance = _totalBalance(token);
        uint256 secondsSinceCliff = block.timestamp.sub(_cliff);

        uint256 percentInPeriod = secondsSinceCliff.mul(10**MATH_PRECISION).div(_periodLength).div(_periodRate);

        if(percentInPeriod > 10000000000) percentInPeriod = 10000000000;

        uint256 calculatedBalance = balance.mul(percentInPeriod).div(10**MATH_PRECISION);

        if(calculatedBalance > currentBalance) return currentBalance;
        return calculatedBalance;
    }

    uint256[50] private ______gap;
}
