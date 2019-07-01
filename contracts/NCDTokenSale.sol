pragma solidity ^0.5.7;

import "zos-lib/contracts/Initializable.sol";
import "openzeppelin-eth/contracts/ownership/Ownable.sol";
import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "openzeppelin-eth/contracts/token/ERC20/TokenTimelock.sol";
import "openzeppelin-eth/contracts/access/roles/MinterRole.sol";

import "./NCDToken.sol";
import "./ITokenVesting.sol";


contract NCDTokenSale is Initializable, Ownable, MinterRole {
    using SafeMath for uint256;

    NCDToken private _token;
    uint256 private _openingTime;
    uint256 private _closingTime;

    uint256 private constant ONE_YEAR_IN_SECONDS = 86400 * 31 * 12;
    uint256 private constant ONE_MONTH_PERIOD_IN_SECONDS = 86400 * 31; // 31 days for a ideal month

    uint256 private constant RELEASE_RATE_PER_MONTH = 10;

    uint256 private _teamTokensTotal;
    uint256 private _teamTokensUnreleased;
    uint256 private _teamTokensReleased;

    ITokenVesting[] private _timeLocks;
    uint256[] private _vestingPeriodsStart;

    event VestingLockAdded(uint256 indexed vestingPeriodStart, uint256 indexed releaseTime, address indexed timeLockAddress,
        uint256 periodLength, uint256 periodRate);

    event TeamVestingAssigned(address teamVesting);

    event VestedTokensWithdrawed(uint256 indexed timestampOfRequest, address indexed timeLockAddress, uint256 vestingPeriodStart,
        uint256 releaseTime, uint256 amount);

    /**
     * @dev Reverts if not in crowdsale time range.
     */
    modifier onlyWhileOpen {
        require(isOpen(), "NCDTokenSale: CrowdSale is closed");
        _;
    }

    function initialize(address owner, uint256 openingTime, uint256 closingTime, NCDToken token) public initializer {
        require(address(token) != address(0), "NCDTokenSale: Zero-Address for token is invalid");
        require(owner != address(0), "NCDTokenSale: address of Owner is invalid");
        require(closingTime > openingTime, "NCDTokenSale: opening time is not before closing time");

        Ownable.initialize(owner);

        // makes owner the very first Minter
        MinterRole.initialize(owner);

        _token = token;

        _openingTime = openingTime;
        _closingTime = closingTime;
    }

    function getTeamTokensTotal() public view returns (uint256) {
        return _teamTokensTotal;
    }

    function getTeamTokensReleased() public view returns (uint256) {
        return _teamTokensReleased;
    }

    function getTeamTokensUnreleased() public view returns (uint256) {
        return _teamTokensUnreleased;
    }

    function getOpeningTime() public view returns (uint256) {
        return _openingTime;
    }

    function getClosingTime() public view returns (uint256) {
        return _closingTime;
    }

    /**
     * @return the token being sold.
     */
    function token() public view returns (NCDToken) {
        return _token;
    }

    /**
     * @return true if the crowdsale is open, false otherwise.
     */
    function isOpen() public view returns (bool) {
        // solhint-disable-next-line not-rely-on-time
        return block.timestamp >= _openingTime && block.timestamp <= _closingTime;
    }

    /**
     * @dev Checks whether the period in which the crowdsale is open has already elapsed.
     * @return Whether crowdsale period has elapsed
     */
    function hasClosed() public view returns (bool) {
        // solhint-disable-next-line not-rely-on-time
        return block.timestamp > _closingTime;
    }

    /**
     * @dev Don't accept any Ether
     */
    function () external payable {
        revert('Payment in ETH not allowed');
    }

    /**
     * @dev Overrides delivery by minting tokens upon purchase.
     * @param beneficiary Token purchaser
     * @param tokenAmount Number of tokens to be minted
     */
    function mintTokens(address beneficiary, uint256 tokenAmount) public onlyMinter onlyWhileOpen {
        _teamTokensTotal = _teamTokensTotal.add(tokenAmount);
        _teamTokensUnreleased = _teamTokensUnreleased.add(tokenAmount);

        require(NCDToken(address(token())).mint(beneficiary, tokenAmount), "NCDTokenSale: Token could not be mintet");
    }

    /**
     * @dev Add vesting lock contract for vested team tokens according to the Whitepaper (https://nuco.cloud)
     */
    function addVestingLock(uint256 vestingPeriodStart, ITokenVesting vesting) public onlyOwner {
        require(address(vesting) != address(0));

        _vestingPeriodsStart.push(vestingPeriodStart);
        _timeLocks.push(vesting);

        emit VestingLockAdded(vestingPeriodStart, vesting.cliff(), address(vesting), vesting.periodLength(), vesting.periodRate());
    }

    /**
     * @dev find the proper timelock for a specific timestamp
     */
    function findTokenTimelock(uint256 timestamp) public view returns (uint256, uint256, address) {
        for(uint256 i = _vestingPeriodsStart.length-1; i >= 0; i--) {
            uint256 vestingPeriodStart = _vestingPeriodsStart[i];
            if(vestingPeriodStart <= timestamp) {
                ITokenVesting vesting = _timeLocks[i];
                if(vesting.start() <= timestamp && timestamp <= vesting.cliff()) {
                    return (vestingPeriodStart, vesting.cliff(), address(vesting));
                }
            }
        }
        revert("No suitable TokenTimelock found");
    }

    function getTimeLockAddress(uint256 timestamp) public view returns (address) {
        (/*uint256 vestingPeriodStart*/, /*uint256 releaseTime*/, address vesting) = findTokenTimelock(timestamp);
        return vesting;
    }

    function getTimeLockDataByIndex(uint256 index) public view returns (address, address, uint256, uint256, uint256, uint256 ) {
        ITokenVesting vesting = _timeLocks[index];
        return (address(vesting), vesting.beneficiary(), vesting.start(), vesting.cliff(), vesting.periodLength(), vesting.periodRate());
    }

    /**
     * @dev mints and withdrawals team related token into the token vesting contract according for current timestamp within ICO
     * @dev it is meant to execute this function at the end of every monthly period
     */
    function withdrawVestedTokens() public returns(uint256) {
        return withdrawVestedTokensByTimestamp(block.timestamp);
    }

    /**
     * @dev mints and withdrawals team related token into the token vesting contract according to a specific timestamp within ICO
     */
    function withdrawVestedTokensByTimestamp(uint256 timestamp) public returns(uint256) {
        require(timestamp >= block.timestamp, "withdraw Vesting Token in the past not allowed");

        // _teamTokensUnreleased represents our amount of token that can be released into TimeLockVesting
        uint256 amount = _teamTokensUnreleased;

        require(amount > 0, "NCDTokenSale: no tokens available yet");

        // find the appropriate TimeLock according to the  timestamp
        (uint256 vestingPeriodStart, uint256 releaseTime, address vesting) = findTokenTimelock(timestamp);

        require(vesting != address(0), "NCDTokenSale: vesting-address is required");
        require(vestingPeriodStart <= timestamp, "NCDTokenSale: Invalid vestingPeriodStart was found");

        // reset unreleased tokens
        _teamTokensUnreleased = 0;

        // increment released tokens by amount
        _teamTokensReleased = _teamTokensReleased.add(amount);

        // mint these tokens into the timelock contract for its vesting period
        require(NCDToken(address(token())).mint(vesting, amount), "NCDTokenSale: tokens could not minted into timelock");

        emit VestedTokensWithdrawed(timestamp, vesting, vestingPeriodStart, releaseTime, amount);

        return amount;
    }

}
