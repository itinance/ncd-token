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

    TokenTimelock private _timeLock;

    /**
     * @dev Reverts if not in crowdsale time range.
     */
    modifier onlyWhileOpen {
        require(isOpen());
        _;
    }

    TeamVesting private _teamVesting;

    event TeamVestingAssigned(address teamVesting);

    function initialize(uint256 openingTime, uint256 closingTime, NCDToken token) public initializer {
        require(address(token) != address(0));

        _token = token;

        // solhint-disable-next-line not-rely-on-time
        require(openingTime >= block.timestamp); // in order to make this testable with Ganache, we have to reduce a second
        require(closingTime > openingTime);

        _openingTime = openingTime;
        _closingTime = closingTime;
    }

    function getOpeningTime() public view returns (uint256) {
        return _openingTime;
    }

    function getClosingTime() public view returns (uint256) {
        return _closingTime;
    }

    function addTimelock(uint256 releaseTime) public {
        _timeLock = new TokenTimelock();
        _timeLock.initialize(_token, address(_teamVesting), releaseTime );
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
        require(NCDToken(address(token())).mint(beneficiary, tokenAmount));
    }

    function withdrawVestedTokens(uint256 period) public returns(uint256) {
    //    require(msg.sender == _teamVesting);

        // calc amount of vestable token that was granted in a specific period
        //uint256 amount = _vestedBalancePerPeriod[period];

        // mint these tokens into the vesting contract
        //super._mint(address(_teamVesting), amount);

        //_vestedBalancePerPeriod[period] = _vestedBalancePerPeriod[period].sub(amount);
        //return amount;
    }


}
