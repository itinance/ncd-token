const truffleAssert = require('truffle-assertions');
const { BN, ether, constants, expectEvent, shouldFail, time } = require('openzeppelin-test-helpers');
const should = require('chai').should();
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;

const NCDToken = artifacts.require('NCDToken');
const TokenVesting = artifacts.require('TokenVestingImpl');
const NCDTokenSale = artifacts.require('NCDTokenSale');

const ONE_YEAR_IN_SECONDS = 86400 * 31 * 12;
const ONE_MONTH_PERIOD_IN_SECONDS = 86400 * 31; // 31 days for a ideal month
const RELEASE_RATE_PER_MONTH = 10;

contract("CrowdSale tests", async ([_, owner, buyer, vesting, pauser1, pauser2, anotherMinter, ...otherAccounts]) => {
    let token, tokenSale,
        openingTime, closingTime, afterClosingTime;

    before(async function () {
      // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
      await time.advanceBlock();

      token = await NCDToken.new({from: owner});
      await token.initialize( owner, [pauser1, pauser2]);
    });

    it('reverts if token shall get minted after crowdsale has already finished', async function() {
      token = await NCDToken.new({from: owner});
      await token.initialize( owner, [pauser1, pauser2]);

      openingTime = (await time.latest()).add(time.duration.weeks(1));
      closingTime = openingTime.add(time.duration.years(1));
      afterClosingTime = closingTime.add(time.duration.seconds(1));

      tokenSale = await NCDTokenSale.new({from: owner});
      await tokenSale.initialize(owner, openingTime, closingTime, token.address);

      await time.increaseTo(afterClosingTime);
      await time.advanceBlock();

      await token.addMinter(tokenSale.address, {from: owner});
      await shouldFail.reverting( tokenSale.mintTokens(buyer, 1000, {from: owner}) );
    })

    context('once token was bought', function () {

      beforeEach(async function () {
          token = await NCDToken.new({from: owner});
          await token.initialize( owner, [pauser1, pauser2]);

          openingTime = await time.latest();
          closingTime = openingTime.add(time.duration.years(1));
          afterClosingTime = closingTime.add(time.duration.seconds(1));

          tokenSale = await NCDTokenSale.new({from: owner});
          await tokenSale.initialize(owner, openingTime, closingTime, token.address);

          await token.addMinter(tokenSale.address, {from: owner});
          await token.renounceMinter({ from: owner });

      });

      it('check ownership', async function() {
        const o = await tokenSale.owner();
        expect(o).to.equal(owner);
      })

      it('crowdsale should be minter', async function () {
        (await token.isMinter(tokenSale.address)).should.equal(true);
      });

      it('owner should not be minter anymore', async function () {
        (await token.isMinter(owner)).should.equal(false);
      });

      it('Timelock can be added', async function() {
        const
          vestingStart1 = afterClosingTime,
          vestingRelease1 = afterClosingTime.add(time.duration.days(31*12)),

          vestingStart2 = vestingStart1.add(time.duration.days(31)),
          vestingRelease2 = vestingStart2.add(time.duration.days(31*12))
          ;

        const tokenVesting = await TokenVesting.new(vesting, vestingStart1, ONE_YEAR_IN_SECONDS, ONE_MONTH_PERIOD_IN_SECONDS, RELEASE_RATE_PER_MONTH, owner);
        let {logs} = await tokenSale.addVestingLock(vestingStart1, tokenVesting.address, {from: owner});

        expectEvent.inLogs(logs, 'VestingLockAdded', {
          vestingPeriodStart: vestingStart1,
          releaseTime: vestingRelease1,
        });

        const tokenVesting2 = await TokenVesting.new(vesting, vestingStart2, ONE_YEAR_IN_SECONDS, ONE_MONTH_PERIOD_IN_SECONDS, RELEASE_RATE_PER_MONTH, owner);
        const tx = await tokenSale.addVestingLock(vestingStart2, tokenVesting2.address, {from: owner});

        logs = tx.logs;
        expectEvent.inLogs(logs, 'VestingLockAdded', {
          vestingPeriodStart: vestingStart2,
          releaseTime: vestingRelease2,
        });
      })

      it('token can not be minted in the crowdsale by non-minter', async function() {
        await shouldFail.reverting(
            tokenSale.mintTokens(buyer, 1000, {from: buyer})
        )
      });

      it('token can not be minted after a minter lost their minter role', async function() {
        await tokenSale.renounceMinter({from: owner});
        await shouldFail.reverting(
            tokenSale.mintTokens(buyer, 1000, {from: owner})
        )
      });

      it('can mint token with a newly added minter', async function() {
        await tokenSale.addMinter(anotherMinter, {from: owner})
        await tokenSale.mintTokens(buyer, 1000, {from: anotherMinter});

        const balance = await token.balanceOf(buyer);
        expect(balance).to.be.bignumber.equal('1000');
    });

    it('token can be minted in the crowdsale by owner', async function() {
          // minting 1000 tokens
          await tokenSale.mintTokens(buyer, 1000, {from: owner});

          const balance = await token.balanceOf(buyer);
          expect(balance).to.be.bignumber.equal('1000');

          // Team Tokens was counted the right way
          expect(await tokenSale.getTeamTokensTotal()).to.be.bignumber.equal('1000');
          expect(await tokenSale.getTeamTokensUnreleased()).to.be.bignumber.equal('1000');
          expect(await tokenSale.getTeamTokensReleased()).to.be.bignumber.equal('0');
      })
    })
});