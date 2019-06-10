pragma solidity ^0.5.7;

import "zos-lib/contracts/Initializable.sol";
import "openzeppelin-eth/contracts/ownership/Ownable.sol";
import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-eth/contracts/token/ERC20/SafeERC20.sol";

/**
 * The aim is to provide a vesting contract that fits completely into NCDT's vesting terms and conditions.
 * With every sold and minted token the same amount goes into this vesting contract.
 * The vesting contract holds multiple vestors where all vested tokens can get released by diverse rates, e.g:
 * Vestor 1 with 93% of vesting token  and Vestor 2 with 7 % of vesting token (referring to the NUCO-Whitepaper)
 *
 * Sold Token
 * TODO: ownership / vesting role required
 */
contract TeamVesting is Initializable, Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // The amount of vesting periods (ideal 31-day-months) that are required to release any tokens
    uint8 private constant MINIMUM_VESTING_PERIODS = 12;


    event AddedBeneficiary(
        address beneficiary,
        uint8 factor
    );

    event RemovedBeneficiary(
        address beneficiary
    );

    event TokenReleased(address beneficiary, uint256 amount, uint256 total);

    // monthly percent rate in percent
    uint8 private constant MONTHLY_VESTING_RATE_IN_PERCENT = 10;

    // Factor in percent per beneficiary
    mapping(address => uint8) private _beneficiaryFactors;

    // all beneficiaries as array
    address[] private _beneficiaries;

   // ERC20 basic token contract being held
    IERC20 private _token;

    // month => address => amount of available token
    mapping (uint256 => mapping( address => uint256 )) private _vestedBalances;

    // momth > address => released balances of token per address per month
    mapping (uint256 => mapping( address => uint256 )) private _releasedBalances;

    // balance total per vestor address
    mapping (address => uint256) private _vestingBalances;

    // ensures that only a vestor can execute this function
    modifier onlyVesting(address beneficiary) {
        require(isVesting(beneficiary));
        _;
    }

    // ensures that only a non-vestor can execute this function
    modifier notVesting(address beneficiary) {
        require(! isVesting(beneficiary));
        _;
    }

    /**
     * @dev Initializer of this contract
     * @param owner Then owner of this contract
     */
    function initialize(IERC20 token, address owner) public initializer {
        Ownable.initialize(owner);

        _token = token;
    }

    /**
     * @dev Adding multiple Beneficiaries at once
     * @param beneficiaries Array of beneficiaries
     * @param factors Array of percentage/proportions per beneficiary according to its index in `beneficiaries`
     */
    function addBeneficiaries(
        address[] memory beneficiaries,
        uint8[] memory factors
    ) public onlyOwner {
        for (uint256 i = 0; i < beneficiaries.length; ++i) {
            addBeneficiary(beneficiaries[i], factors[i]);
        }
    }

    /**
     * @dev Calculates the amount of additional token that the vestor will receive according to his contract
     */
    function calcVestingAmount(address beneficiary, uint256 value) public view returns (uint256) {
        // factor in percent (20 = 20%)
        uint8 factor = _beneficiaryFactors[beneficiary];
        return value.mul(factor).div(100);
    }

    /**
     * @dev Add another Beneficiary
     * @param beneficiary Address of vestor
     * @param factor The factor in percent (20 = 20%) he will be registered for after every minting process
     */
    function addBeneficiary(address beneficiary, uint8 factor) public onlyOwner notVesting(beneficiary) {
        _beneficiaryFactors[beneficiary] = factor;
        _beneficiaries.push(beneficiary);

        emit AddedBeneficiary(beneficiary, factor);
    }

    function removeBeneficiary(address beneficiary) public onlyOwner onlyVesting(beneficiary) {
        delete _beneficiaryFactors[beneficiary];
        emit RemovedBeneficiary(beneficiary);
    }

    /**
     * @return true if the beneficiary is vesting
     */
    function isVesting(address beneficiary) public view returns (bool) {
        return _beneficiaryFactors[beneficiary] > 0;
    }

    /**
     * @return Percentage for the proportion of a beneficiary
     */
    function getVestingFactor(address beneficiary) public view returns (uint256) {
        return _beneficiaryFactors[beneficiary];
    }

    /**
     * @return Balance of vested token per beneficiary in total (no matter of vesting period and if they was already released)
     */
    function balanceOfVesting(address beneficiary) public view returns (uint256) {
        uint256 balance = _token.balanceOf(address(this));
        return this.calcVestingAmount(beneficiary, balance);
    }

    /**
     * @return Balance of vested token per beneficiary for a specific period (in terms of a 31-day-month)
     */
    function balanceOfVestingForPeriod(address beneficiary, uint256 period) public view returns (uint256) {
        return _vestedBalances[period][beneficiary];
    }

    function releaseTokensForPeriod(uint256 period) public {
        // we iterate over all beneficiaries
        for (uint256 i = 0; i < _beneficiaries.length; ++i) {
            // asking for their address
            address beneficiary = _beneficiaries[i];

            releaseTokensForPeriodAndBeneficiary(beneficiary, period);
        }
    }

    /**
     *
     */
    function releaseTokensForPeriodAndBeneficiary(address beneficiary, uint256 period) public {
        // asking for those token that could be released in current period
        (uint256 balance, uint256[] memory balancePerMonth) = calcReleasableTokenForPeriod(beneficiary, period);

        // if no more tokens can be released right now, we won't throw or revert here
        // because this function shall be able to executed so often as the vesting people want it to do.
        if(balance == 0) return;

        _vestedBalances[period -  MINIMUM_VESTING_PERIODS - 1][beneficiary] = _vestedBalances[period -  MINIMUM_VESTING_PERIODS - 1][beneficiary].sub( balance );
        _releasedBalances[period][beneficiary] = _releasedBalances[period][beneficiary].add(balance);

        _token.safeTransfer(beneficiary, balance);

        emit TokenReleased(beneficiary, balance, _vestingBalances[beneficiary]);
    }

    /**
     * @dev Calculates the amount of token that could be released in a certain range of time until a specific period
     * @param beneficiary The vestors address
     * @param period The period until all tokens could be released that wasn't released yet
     * @return balance, balanceOfMonth
     */
    function calcReleasableTokenForPeriod(address beneficiary, uint256 period) public view returns (uint256, uint256[] memory) {
        uint256 balance = 0;
        uint256 maxPeriod = period < MINIMUM_VESTING_PERIODS ? 0 : period - MINIMUM_VESTING_PERIODS;
        uint256[] memory balancePerMonth = new uint256[](maxPeriod);

        for (uint256 i = 0; i < maxPeriod; ++i) {
            uint256 vestedBalanceInPeriod = _vestedBalances[i][beneficiary];
            uint256 releasableBalance = vestedBalanceInPeriod
                .div(MONTHLY_VESTING_RATE_IN_PERCENT);

            balance = balance.add(releasableBalance);
            balancePerMonth[i] = balancePerMonth[i].add(releasableBalance);
        }

        return (balance, balancePerMonth);
    }

/*    function registerTeamToken(uint256 value) public {
        // we iterate over all beneficiaries
        for (uint256 i = 0; i < _beneficiaries.length; ++i) {
            // asking for their address
            address beneficiary = _beneficiaries[i];

            // asking for their vesting amount according to their personal deal
            uint256 vestedAmount = calcVestingAmount(beneficiary, value);

            // calculates the current vesting period in terms of a ideal 31-days-month
            uint256 currentMonth = calcCurrentVestingPeriod();

            // registering the vested token on this "monthly" vesting period per beneficiary
            _vestingBalances[beneficiary] = _vestingBalances[beneficiary].add(vestedAmount);

            // registering the vested token on this "monthly" vesting period per beneficiary
            _vestedBalances[currentMonth][beneficiary] = _vestedBalances[currentMonth][beneficiary].add(vestedAmount);

            // fire event
            emit TeamTokenRegistration(beneficiary, vestedAmount, currentMonth );
        }
    }
*/
}