pragma solidity ^0.5.7;

import "zos-lib/contracts/Initializable.sol";
import "openzeppelin-eth/contracts/ownership/Ownable.sol";
import "openzeppelin-eth/contracts/math/SafeMath.sol";

contract MonthlyVestedTeamTokens is Initializable, Ownable {
    using SafeMath for uint256;

    event TeamTokenGranted(uint256 period, uint256 amount);


    // Constants for date calculation
    uint32 private constant SECONDS_PER_DAY = 24 * 60 * 60;

    // to make things easier, we decided to make a month 31 days long.
    // this way we can fullfil our promise that the vesting period is at least (and even more) than a year (31*12=372 days)
    // and all math can be done with less effort
    uint8 private constant DAYS_PER_VESTING_PERIOD = 31;

    // unix timestamp from deployment of this contract
    uint256 _startVesting;

    // month => amount of available token
    mapping (uint256 => uint256 ) internal _vestedBalancePerPeriod;

    // momth > released balances of token per month
    uint256 private _vestedReleasedBalance;

    function initialize() public initializer {
        _startVesting = now;
    }

    /**
     * @dev Returns the start of the whole vesting period, starting with deployment and initializing on the Main net
     * @return unix timestamp
     */
    function getStartVesting() public view returns (uint256) {
        return _startVesting;
    }

    function getVestedBalancePerPeriod(uint256 period) public view returns (uint256) {
        return _vestedBalancePerPeriod[period];
    }

    function getVestedReleasedBalance() public view returns (uint256) {
        return _vestedReleasedBalance;
    }

    function grantTokensForVesting(uint256 period, uint256 amount) internal {
        _vestedBalancePerPeriod[period] = _vestedBalancePerPeriod[period].add(amount);
    }

    function grantTokensForVesting(uint256 amount) internal {
        uint256 period = calcCurrentVestingPeriod();
        grantTokensForVesting(period, amount);

        emit TeamTokenGranted(period, amount);
    }

    /**
     * @dev Calculates a specific vesting period which is a ideal month with a duration of 31 days fixed
     * @param start The unix timestamp of the general start of this sale period / time of contract deployment on main net
     * @param current The current time from which the current vesting period needs to be calculated
     * @return The current vesting period (starting with 0 for the first "month", 1 for the next and so on, based on 31 days per month fixed)
     */
    function calcVestingPeriod(uint256 start, uint256 current) public pure returns (uint256) {
        require(current >= start);
        uint256 delta = current.sub(start);
        return delta.div(SECONDS_PER_DAY).div(DAYS_PER_VESTING_PERIOD);
    }

    /**
     * @dev Calculates current vesting period depending from the stating date of this contract
     */
    function calcCurrentVestingPeriod() public view returns (uint256) {
        return calcVestingPeriod(_startVesting, now);
    }

}