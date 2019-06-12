const truffleAssert = require('truffle-assertions');
const { BN, ether, constants, expectEvent, shouldFail, time } = require('openzeppelin-test-helpers');
const should = require('chai').should();
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;

const NCDToken = artifacts.require('NCDToken');

const NCDTokenSale = artifacts.require('NCDTokenSale');



contract("CrowdSale TeamToken tests", async ([_, owner, buyer, another, pauser1, pauser2,  ...otherAccounts]) => {

    before(async function () {
      // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
      await time.advanceBlock();
    });

    beforeEach(async function () {

      // Define time range of the crows sale
      this.openingTime = (await time.latest()).add(time.duration.weeks(1));
      this.closingTime = this.openingTime.add(time.duration.years(1));
      this.afterClosingTime = this.closingTime.add(time.duration.seconds(1));

    // define vesting periods with a length of 10 days
      this.vestingStart1 = this.openingTime;
      this.vestingRelease1 = this.vestingStart1.add(time.duration.days(10));

      this.vestingStart2 = this.vestingRelease1.add(time.duration.seconds(1));
      this.vestingRelease2 = this.vestingStart2.add(time.duration.days(10));

      this.token = await NCDToken.new({from: owner});
      await this.token.initialize( owner, [pauser1, pauser2]);

      this.tokenSale = await NCDTokenSale.new({from: owner});
      await this.tokenSale.initialize(this.openingTime, this.closingTime, this.token.address);

      await this.token.addMinter(this.tokenSale.address, {from: owner});
      await this.token.renounceMinter({ from: owner });
    });

    context('once deployed', function () {
        beforeEach(async function () {
          // Prepare vesting Locks
          await this.tokenSale.addVestingLock(this.vestingStart1, this.vestingRelease1);
          await this.tokenSale.addVestingLock(this.vestingStart2, this.vestingRelease2);

          this.timeLock1 = await this.tokenSale.getTimeLockAddress(this.vestingStart1);
          this.timeLock2 = await this.tokenSale.getTimeLockAddress(this.vestingStart2);

          await time.increaseTo(this.openingTime);
          await time.advanceBlock();

          // minting 1000 tokens
          await this.tokenSale.mintTokens(buyer, 1000);
        });

        it('will find the appropriate TokenTimelock for specific timestamps', async function() {
          let timestamp = this.vestingStart1.add(time.duration.days(5));

          let result =  await this.tokenSale.findTokenTimelock(timestamp);

          let periodStart = result[0],
            releaseTime = result[1];

          expect(periodStart).to.be.bignumber.equal(this.vestingStart1);
          expect(releaseTime).to.be.bignumber.equal(this.vestingRelease1);

          // lets try to find the second period
          timestamp = this.vestingStart2.add(time.duration.days(5));

          result =  await this.tokenSale.findTokenTimelock(timestamp);

          periodStart = result[0];
          releaseTime = result[1];

          expect(periodStart).to.be.bignumber.equal(this.vestingStart2);
          expect(releaseTime).to.be.bignumber.equal(this.vestingRelease2);
        });

        it('virtual team tokens are growing as long as not released', async function() {
            let balance = await this.token.balanceOf(buyer);
            expect(balance).to.be.bignumber.equal('1000');

            // Team Tokens was counted the right way
            expect(await this.tokenSale.getTeamTokensTotal()).to.be.bignumber.equal('1000');
            expect(await this.tokenSale.getTeamTokensUnreleased()).to.be.bignumber.equal('1000');
            expect(await this.tokenSale.getTeamTokensReleased()).to.be.bignumber.equal('0');

            // minting 1000 tokens
            await this.tokenSale.mintTokens(another, 500);

            balance = await this.token.balanceOf(another);
            expect(balance).to.be.bignumber.equal('500');

            // Team Tokens was counted the right way
            expect(await this.tokenSale.getTeamTokensTotal()).to.be.bignumber.equal('1500');
            expect(await this.tokenSale.getTeamTokensUnreleased()).to.be.bignumber.equal('1500');
            expect(await this.tokenSale.getTeamTokensReleased()).to.be.bignumber.equal('0');
        })

        it('Release token into TeamVesting contract works in Period 1', async function() {
            const timestampOfRequest = this.vestingRelease1.sub(time.duration.seconds(1));
            const tx = await this.tokenSale.withdrawVestedTokensByTimestamp( timestampOfRequest );

            const {logs} = tx;

            expectEvent.inLogs(logs, 'VestedTokensWithdrawed', {
              timestampOfRequest: timestampOfRequest,
              vestingPeriodStart: this.vestingStart1,
              releaseTime: this.vestingRelease1,
              amount: '1000'
            });

            // grabbing the address of specific timelock and check the balance

            const event = logs[0];
            const {timeLockAddress} = event.args;

            // it must have beed timelock 1
            expect(timeLockAddress).to.equal(this.timeLock1);

            expect(await this.token.balanceOf(this.timeLock1)).to.be.bignumber.equal('1000');

            // while timelock for period 2 is still zero
            expect(await this.token.balanceOf(this.timeLock2)).to.be.bignumber.equal('0');

        })

        it('Release token into TeamVesting contract works in Period 2 when Period 1 was forgotten to release', async function() {
          // this test case covers the following scenario:
          // since 1000 tokens was minted in the first vesting period, but was not released yet,
          // they can be transfered into the team vesting contract in period 2 as well.
          // They are still 1000 token yet because no other tokens was minted so far.

          const timestampOfRequest = this.vestingRelease2.sub(time.duration.seconds(1));
          const {logs} = await this.tokenSale.withdrawVestedTokensByTimestamp( timestampOfRequest );

          expectEvent.inLogs(logs, 'VestedTokensWithdrawed', {
            timestampOfRequest: timestampOfRequest,
            vestingPeriodStart: this.vestingStart2,
            releaseTime: this.vestingRelease2,
            amount: '1000',
            timeLockAddress: this.timeLock2
          });

          expect(await this.token.balanceOf(this.timeLock1)).to.be.bignumber.equal('0');
          expect(await this.token.balanceOf(this.timeLock2)).to.be.bignumber.equal('1000');

        })

        it('Release token into TeamVesting contract works in Period 2 after Period 1 was forgotten to release but more tokens was minted', async function() {
          // this test case covers the following scenario:
          // since 1000 tokens was minted in the first vesting period, but was not released yet,
          // and another 500 tokens was minted in the second vesting period,
          // 1500 tokens in total would transferd into vesting contract in a release-call in period 2

          // minting further 500 tokens
          await time.increaseTo(this.vestingStart2.add(time.duration.seconds(1)));
          await this.tokenSale.mintTokens(another, 500);

          const timestampOfRequest = this.vestingRelease2.sub(time.duration.seconds(1));
          const {logs} = await this.tokenSale.withdrawVestedTokensByTimestamp( timestampOfRequest );

          expectEvent.inLogs(logs, 'VestedTokensWithdrawed', {
            timestampOfRequest: timestampOfRequest,
            vestingPeriodStart: this.vestingStart2,
            releaseTime: this.vestingRelease2,
            amount: '1500',
            timeLockAddress: this.timeLock2,
          });

          expect(await this.token.balanceOf(this.timeLock1)).to.be.bignumber.equal('0');
          expect(await this.token.balanceOf(this.timeLock2)).to.be.bignumber.equal('1500');
        })

        it('Minting token in period 1 and releasing in period 1 works as well minting more token later and release in same period', async function() {

          // in this scenario we release on a day middle of vesting period 1 our team tokens
          // and will get 1000 token as expected

          const timestampOfRequest = this.vestingStart1.add(time.duration.days(4));
          let {logs} = await this.tokenSale.withdrawVestedTokensByTimestamp( timestampOfRequest );

          // 1500 tokens are expected to get
          expectEvent.inLogs(logs, 'VestedTokensWithdrawed', {
            timestampOfRequest: timestampOfRequest,
            vestingPeriodStart: this.vestingStart1,
            releaseTime: this.vestingRelease1,
            amount: '1000'
          });

          // one day later, further 500 tokens was sold and minted
          await time.increaseTo(this.vestingStart1.add(time.duration.days(5)));
          await this.tokenSale.mintTokens(another, 500);

          // add the end of the period we expect this tokens as well being released into team vesting contract
          const tx = await this.tokenSale.withdrawVestedTokensByTimestamp( timestampOfRequest );
          logs = tx.logs;

          // 1500 tokens are expected to get
          expectEvent.inLogs(logs, 'VestedTokensWithdrawed', {
            timestampOfRequest: timestampOfRequest,
            vestingPeriodStart: this.vestingStart1,
            releaseTime: this.vestingRelease1,
            amount: '500'
          });

        })

      })



});