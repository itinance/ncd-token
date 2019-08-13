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

    uint256 private _teamTokensTotal;
    uint256 private _teamTokensUnreleased;
    uint256 private _teamTokensReleased;

    /**
     * @dev Array that holds all time locks / token vesting contracts
     */
    ITokenVesting[] private _timeLocks;

    /**
     * @dev Array that holds all vesting periods as unix timestamp
     */
    uint256[] private _vestingPeriodsStart;


    /**
     * An event that is dispatched after a time lock was registered for a specific period of time
     */
    event VestingLockAdded(uint256 indexed vestingPeriodStart, uint256 indexed releaseTime, address indexed timeLockAddress,
        uint256 periodLength, uint256 periodRate);

    /**
     * An event that is dispatched after a amount of team tokens was released into Time Lock / TokenVesting contract
     */
    event VestedTokensWithdrawed(uint256 indexed timestampOfRequest, address indexed timeLockAddress, uint256 vestingPeriodStart,
        uint256 releaseTime, uint256 amount);

    /**
     * @dev Reverts if not in crowdsale time range.
     */
    modifier onlyWhileOpen {
        require(isOpen(), "NCDTokenSale: CrowdSale is closed");
        _;
    }

    /**
     * @dev Initializer
     * @param owner The owner of the contract, will automatically become the initial minter
     * @param openingTime Opening time of token sale
     * @param closingTime Closing time of token sale
     * @param token The token to sale
     */
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

    /**
     * @return Returns the team tokens that are available in total (see vesting rules in whitepaper at https://nuco.cloud)
     */
    function getTeamTokensTotal() external view returns (uint256) {
        return _teamTokensTotal;
    }

    /**
     * @return Returns the team tokens that were already released in total (see vesting rules in whitepaper at https://nuco.cloud)
     */
    function getTeamTokensReleased() external view returns (uint256) {
        return _teamTokensReleased;
    }

    /**
     * @return Returns unreleased team tokens that are available to release
     */
    function getTeamTokensUnreleased() external view returns (uint256) {
        return _teamTokensUnreleased;
    }

    /**
     * @return Opening time of token sale
     */
    function getOpeningTime() external view returns (uint256) {
        return _openingTime;
    }

    /**
     * @return Closing time of token sale
     */
    function getClosingTime() external view returns (uint256) {
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
    function hasClosed() external view returns (bool) {
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
    function mintTokens(address beneficiary, uint256 tokenAmount) external onlyMinter onlyWhileOpen {
        _teamTokensTotal = _teamTokensTotal.add(tokenAmount);
        _teamTokensUnreleased = _teamTokensUnreleased.add(tokenAmount);

        require(NCDToken(address(token())).mint(beneficiary, tokenAmount), "NCDTokenSale: Token could not be mintet");
    }

    /**
     * @dev Add vesting lock contract for vested team tokens according to the Whitepaper (https://nuco.cloud)
     */
    function addVestingLock(uint256 vestingPeriodStart, ITokenVesting vesting) external onlyOwner {
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

    /**
     * @return Returns address of a specific time lock according to a timestamp
     */
    function getTimeLockAddress(uint256 timestamp) public view returns (address) {
        (/*uint256 vestingPeriodStart*/, /*uint256 releaseTime*/, address vesting) = findTokenTimelock(timestamp);
        return vesting;
    }

    /**
     * @return Returns all vesting related attributes for a specific time lock addressed by index
     */
    function getTimeLockDataByIndex(uint256 index) public view returns (address, address, uint256, uint256, uint256, uint256 ) {
        ITokenVesting vesting = _timeLocks[index];
        return (address(vesting), vesting.beneficiary(), vesting.start(), vesting.cliff(), vesting.periodLength(), vesting.periodRate());
    }

    /**
     * @dev mints and withdrawals team related token into the token vesting contract according for current timestamp within ICO
     * @dev it is meant to execute this function at the end of every monthly period
     */
    function withdrawVestedTokens() external returns(uint256) {
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

        // find the appropriate TimeLock according to the timestamp
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
