pragma solidity ^0.5.7;

import "zos-lib/contracts/Initializable.sol";
import "openzeppelin-eth/contracts/ownership/Ownable.sol";
import "openzeppelin-eth/contracts/math/SafeMath.sol";

import "openzeppelin-eth/contracts/token/ERC20/TokenTimelock.sol";

import "./NCDToken.sol";
import "./TeamVesting.sol";

contract NCDTokenSale is Initializable, Ownable {
    using SafeMath for uint256;

    NCDToken private _token;
    uint256 private _openingTime;
    uint256 private _closingTime;

    uint256 private _teamTokensTotal;
    uint256 private _teamTokensUnreleased;
    uint256 private _teamTokensReleased;

    TokenTimelock[] private _timeLocks;
    uint256[] private _vestingPeriodsStart;

    event VestingLockAdded(uint256 vestingPeriodStart, uint256 releaseTime);

    event VestedTokensWithdrawed(uint256 indexed timestampOfRequest, uint256 vestingPeriodStart, uint256 releaseTime, uint256 amount);

    /**
     * @dev Reverts if not in crowdsale time range.
     */
    modifier onlyWhileOpen {
        require(isOpen(), "NCDTokenSale: CrowdSale is closed" );
        _;
    }

    TeamVesting private _teamVesting;

    event TeamVestingAssigned(address teamVesting);

    function initialize(uint256 openingTime, uint256 closingTime, NCDToken token) public initializer {
        require(address(token) != address(0), "NCDTokenSale: Zero-Address for token is invalid");

        _token = token;

        // solhint-disable-next-line not-rely-on-time
        require(openingTime >= block.timestamp - 1, "NCDTokenSale: opening time is before current time");
        require(closingTime > openingTime, "NCDTokenSale: opening time is not before closing time");

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

    function assignTeamVesting(TeamVesting teamVesting) public onlyOwner {
        require(address(teamVesting) != address(0));

        _teamVesting = teamVesting;
        emit TeamVestingAssigned(address(teamVesting));
    }

    function () external payable {
        revert('Payment in ETH not allowed');
    }

    /**
     * @dev Overrides delivery by minting tokens upon purchase.
     * @param beneficiary Token purchaser
     * @param tokenAmount Number of tokens to be minted
     */
    function mintTokens(address beneficiary, uint256 tokenAmount) public onlyWhileOpen {
        _teamTokensTotal = _teamTokensTotal.add(tokenAmount);
        _teamTokensUnreleased = _teamTokensUnreleased.add(tokenAmount);

        require(NCDToken(address(token())).mint(beneficiary, tokenAmount));
    }

    function addVestingLock(uint256 vestingPeriodStart, uint256 releaseTime) public {
        require(vestingPeriodStart < releaseTime);
        // TODO: check also for overlapping periods)

        TokenTimelock timeLock = new TokenTimelock();
        timeLock.initialize(_token, address(_teamVesting), releaseTime );

        _vestingPeriodsStart.push(vestingPeriodStart);
        _timeLocks.push(timeLock);

        emit VestingLockAdded(vestingPeriodStart, releaseTime);
    }

    function findTokenTimelock(uint256 timestamp) public view returns (uint256, uint256, TokenTimelock) {
        for(uint256 i = 0; i < _vestingPeriodsStart.length; i++) {
            uint256 vestingPeriodStart = _vestingPeriodsStart[i];
            if(vestingPeriodStart <= timestamp) {
                TokenTimelock timeLock = _timeLocks[i];
                if(timeLock.releaseTime() >= timestamp) {
                    return (vestingPeriodStart, timeLock.releaseTime(), timeLock);
                }
            }
        }
        revert("No suitable TokenTimelock found");
    }

    function withdrawVestedTokensByTimestamp(uint256 timestamp) public returns(uint256) {
    //    require(msg.sender == _teamVesting);

        // _teamTokensUnreleased represents our amount of token that can be released into TimeLockVesting
        uint256 amount = _teamTokensUnreleased;

        // find the appropriate TimeLock according to the  timestamp

        (uint256 _vestingPeriodStart, uint256 _releaseTime, TokenTimelock timeLock) = findTokenTimelock(timestamp);

        require(_vestingPeriodStart <= timestamp, "Invalid _vestingPeriodStart was found");

        //require(timestamp <= timeLock.releaseTime(), "Invalid _vestingPeriodStart was found");

        // reset unreleased tokens
        _teamTokensUnreleased = 0;

        // increment released tokens by amount
        _teamTokensReleased = _teamTokensReleased.add(amount);

        // mint these tokens into the timelock contract for its vesting period
//        super._mint(address(timeLock), amount);
        require(NCDToken(address(token())).mint(address(timeLock), amount));

        emit VestedTokensWithdrawed(timestamp, _vestingPeriodStart, _releaseTime, amount);

        return amount;
    }


}
