const truffleAssert = require('truffle-assertions');
const { BN, ether, constants, expectEvent, shouldFail, time } = require('openzeppelin-test-helpers');
const should = require('chai').should();
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;

const TeamVesting = artifacts.require('TeamVesting');
const TokenVesting = artifacts.require('TokenVestingImpl');
const NCDToken = artifacts.require('NCDTokenImpl');
const NCDTokenSale = artifacts.require('NCDTokenSaleImpl');

const ONE_YEAR_IN_SECONDS = 86400 * 31 * 12;
const ONE_MONTH_PERIOD_IN_SECONDS = 86400 * 31; // 31 days for a ideal month
const RELEASE_RATE_PER_MONTH = 10;


contract("CrowdSale TeamToken tests", async ([_, owner, buyer, another, pauser1, pauser2, vestor1, vestor2, ...otherAccounts]) => {

    before(async function () {
      // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
      await time.advanceBlock();
    });

    beforeEach(async function () {
      // Define time range of the crows sale
      this.openingTime = (await time.latest()).add(time.duration.weeks(1));
      this.closingTime = this.openingTime.add(time.duration.years(1));
      this.afterClosingTime = this.closingTime.add(time.duration.seconds(1));

      this.cliffDuration = time.duration.days(31 * 12);
      this.periodLength = time.duration.days(31);
      this.periodRate = 10;


    // define vesting periods with a length of 31 days
      this.vestingStart1 = this.openingTime;
      this.vestingRelease1 = this.vestingStart1.add(this.cliffDuration);

      this.vestingStart2 = this.vestingStart1.add(time.duration.days(31));
      this.vestingRelease2 = this.vestingStart2.add(this.cliffDuration);

      this.token = await NCDToken.new(owner, [pauser1, pauser2], {from: owner});

      this.tokenSale = await NCDTokenSale.new(owner, this.openingTime, this.closingTime, this.token.address, {from: owner});

      await this.token.addMinter(this.tokenSale.address, {from: owner});
      await this.token.renounceMinter({ from: owner });

      this.vesting = await TeamVesting.new();
      await this.vesting.initialize(owner);
      await this.vesting.addBeneficiaries([vestor1, vestor2], [93, 7], {from: owner});
    });

    it('is owned by Owner', async function() {
      expect(await this.tokenSale.owner()).to.equal(owner);
    })

    it('reverts if a non-owner tries to add a vesting lock ', async function() {
      const tokenVesting = await TokenVesting.new(this.vesting.address, this.vestingStart1, ONE_YEAR_IN_SECONDS, ONE_MONTH_PERIOD_IN_SECONDS, RELEASE_RATE_PER_MONTH, owner);

      await shouldFail.reverting(
        this.tokenSale.addVestingLock(this.vestingStart1, tokenVesting.address)
      );
    })

    it('reverts if no sufficient tokens are available for vesting', async function() {
      await shouldFail.reverting(
        this.tokenSale.withdrawVestedTokens()
      )
    });


    context('once deployed', function () {
        beforeEach(async function () {
          // Prepare vesting Locks

          const tokenVesting1 = await TokenVesting.new(this.vesting.address, this.vestingStart1, ONE_YEAR_IN_SECONDS, ONE_MONTH_PERIOD_IN_SECONDS, RELEASE_RATE_PER_MONTH, owner);
          await this.tokenSale.addVestingLock(this.vestingStart1, tokenVesting1.address, {from: owner});

          const tokenVesting2 = await TokenVesting.new(this.vesting.address, this.vestingStart2, ONE_YEAR_IN_SECONDS, ONE_MONTH_PERIOD_IN_SECONDS, RELEASE_RATE_PER_MONTH, owner);
          await this.tokenSale.addVestingLock(this.vestingStart2, tokenVesting2.address, {from: owner});

          await time.increaseTo(this.openingTime);
          await time.advanceBlock();

          this.timeLock1 = await this.tokenSale.getTimeLockAddress(this.vestingStart1);
          this.timeLock2 = await this.tokenSale.getTimeLockAddress(this.vestingStart2);

          // minting 1000 tokens
          await this.tokenSale.mintTokens(buyer, 1000, {from: owner});
        });

        it('time locks of different vesting periods have different addresses', async function() {
          expect( this.timeLock1 ).to.not.equal( this.timeLock2 );
        })

        it('can get state', async function() {
          expect(this.timeLock1).to.not.equal(this.timeLock2);

          const tl1 = await this.tokenSale.getTimeLockDataByIndex(0);

          expect(this.timeLock1).to.equal(tl1[0]); // address

          expect(this.vesting.address).to.equal(tl1[1]); // beneficiary
          expect(this.vestingStart1).to.be.bignumber.equal(tl1[2]); // start
          expect(this.vestingRelease1).to.be.bignumber.equal(tl1[3]); // cliff
          expect(this.periodLength).to.be.bignumber.equal(tl1[4]); // periodLength
          expect(this.periodRate).to.equal(tl1[5].toNumber()); // periodRate

          const tl2 = await this.tokenSale.getTimeLockDataByIndex(1);

          expect(this.timeLock2).to.equal(tl2[0]); // address

          expect(this.vesting.address).to.equal(tl2[1]); // beneficiary
          expect(this.vestingStart2).to.be.bignumber.equal(tl2[2]); // start
          expect(this.vestingRelease2).to.be.bignumber.equal(tl2[3]); // cliff
          expect(this.periodLength).to.be.bignumber.equal(tl2[4]); // periodLength
          expect(this.periodRate).to.equal(tl2[5].toNumber()); // periodRate
        })

        it('reverts if somebody tries to update beneficiary that is not allowed to do so', async function () {
          const vesting = await TokenVesting.at(this.timeLock1);
          expect( await vesting.beneficiary()).to.equal(this.vesting.address);

          await shouldFail.reverting(vesting.updateBeneficiary(another, {from: buyer}));

          expect( await vesting.beneficiary()).to.equal(this.vesting.address);
        });


        it('can change team vesting beneficiary on a single vesting contract', async function () {
          const vesting = await TokenVesting.at(this.timeLock1);
          const tx = await vesting.updateBeneficiary(another, {from: owner});

          const { logs } = tx;

          expectEvent.inLogs(logs, 'BeneficiaryUpdate', {
            beneficiary: another,
            oldBeneficiary: this.vesting.address,
          });

          expect( await vesting.beneficiary()).to.equal(another);
        });

        context('Collecting team tokens', function () {

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
              await this.tokenSale.mintTokens(another, 500, {from: owner});

              balance = await this.token.balanceOf(another);
              expect(balance).to.be.bignumber.equal('500');

              // Team Tokens was counted the right way
              expect(await this.tokenSale.getTeamTokensTotal()).to.be.bignumber.equal('1500');
              expect(await this.tokenSale.getTeamTokensUnreleased()).to.be.bignumber.equal('1500');
              expect(await this.tokenSale.getTeamTokensReleased()).to.be.bignumber.equal('0');

              expect(await this.token.balanceOf(this.timeLock1)).to.be.bignumber.equal('0');
              expect(await this.token.balanceOf(this.timeLock2)).to.be.bignumber.equal('0');
          })


          it('Release token into TeamVesting contract works in Period 1', async function() {
              const timestampOfRequest = this.vestingStart2.sub(time.duration.seconds(1));

              const tx = await this.tokenSale.withdrawVestedTokensByTimestamp( timestampOfRequest );

              const {logs} = tx;

              expectEvent.inLogs(logs, 'VestedTokensWithdrawed', {
                timestampOfRequest: timestampOfRequest,
                timeLockAddress: this.timeLock1,
                vestingPeriodStart: this.vestingStart1,
                releaseTime: this.vestingRelease1,
                amount: '1000'
              });

              // grabbing the address of specific timelock and check the balance
              const event = logs.find( e => e.event === 'VestedTokensWithdrawed' );
              const { timeLockAddress } = event.args;

              // it must have beed timelock 1
              expect(timeLockAddress).to.equal(this.timeLock1);

              // with a balance of 1000
              expect(await this.token.balanceOf(this.timeLock1)).to.be.bignumber.equal('1000');

              // while timelock for period 2 is still zero
              expect(await this.token.balanceOf(this.timeLock2)).to.be.bignumber.equal('0');
          })

          it('Withdrawing twice will not double the team vesting tokens', async function() {
            const timestampOfRequest = this.vestingStart2.sub(time.duration.seconds(1));

            let tx = await this.tokenSale.withdrawVestedTokensByTimestamp( timestampOfRequest );
            let logs = tx.logs;

            expectEvent.inLogs(logs, 'VestedTokensWithdrawed', {
              timestampOfRequest: timestampOfRequest,
              timeLockAddress: this.timeLock1,
              vestingPeriodStart: this.vestingStart1,
              releaseTime: this.vestingRelease1,
              amount: '1000'
            });

            await shouldFail.reverting(
              this.tokenSale.withdrawVestedTokensByTimestamp( timestampOfRequest )
            );

            // with a balance of 1000
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
            await this.tokenSale.mintTokens(another, 500, {from: owner});

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

          it('reverts if somebody wants to withdraw vested tokens in the past in favor of releasing into an earlier timelock', async function() {
            let timestampOfRequest = this.vestingStart1.add(time.duration.days(4));
            await time.increaseTo(timestampOfRequest.add(time.duration.seconds(1)));
            await shouldFail.reverting(this.tokenSale.withdrawVestedTokensByTimestamp( timestampOfRequest ));
          })


          it('Minting token in period 1 and releasing in period 1 works as well minting more token later and release in the then-current period (period 2)', async function() {
            // in this scenario we release on a day middle of vesting period 1 our team tokens
            // and will get 1000 token as expected

            let timestampOfRequest = this.vestingStart1.add(time.duration.days(4));
            let { logs } = await this.tokenSale.withdrawVestedTokensByTimestamp( timestampOfRequest );

            // 1000 tokens are expected to get
            expectEvent.inLogs(logs, 'VestedTokensWithdrawed', {
              timestampOfRequest: timestampOfRequest,
              vestingPeriodStart: this.vestingStart1,
              releaseTime: this.vestingRelease1,
              amount: '1000'
            });

            // one day later, further 500 tokens was sold and minted
            await time.increaseTo(this.vestingStart1.add(time.duration.days(5)));
            await this.tokenSale.mintTokens(another, 500, {from: owner});

            // add the end of the period we expect this tokens as well being released into team vesting contract
            timestampOfRequest = this.vestingStart2.add(time.duration.seconds(1));
            await time.increaseTo(timestampOfRequest);
            const tx = await this.tokenSale.withdrawVestedTokensByTimestamp( timestampOfRequest );
            logs = tx.logs;

            // 1500 tokens are expected to get
            expectEvent.inLogs(logs, 'VestedTokensWithdrawed', {
              timestampOfRequest: timestampOfRequest,
              vestingPeriodStart: this.vestingStart2,
              releaseTime: this.vestingRelease2,
              amount: '500'
            });

            expect(await this.token.balanceOf(this.timeLock1)).to.be.bignumber.equal('1000');
            expect(await this.token.balanceOf(this.timeLock2)).to.be.bignumber.equal('500');
          })

          it('Minting token in period 1 and releasing in period 1 works as well like minting in period 2 and releasing in period 2', async function() {
            // in this scenario we release on a day middle of vesting period 1 our team tokens
            // and will get 1000 token as expected

            let timestampOfRequest = this.vestingStart1.add(time.duration.days(4));
            let {logs} = await this.tokenSale.withdrawVestedTokensByTimestamp( timestampOfRequest );

            // 1500 tokens are expected to get
            expectEvent.inLogs(logs, 'VestedTokensWithdrawed', {
              timestampOfRequest: timestampOfRequest,
              vestingPeriodStart: this.vestingStart1,
              releaseTime: this.vestingRelease1,
              amount: '1000'
            });

            // one day later, further 500 tokens was sold and minted
            await time.increaseTo(this.vestingStart2.add(time.duration.days(5)));
            await this.tokenSale.mintTokens(another, 500, {from: owner});

            // add the end of the period we expect this tokens as well being released into team vesting contract
            timestampOfRequest = this.vestingRelease2.sub(time.duration.seconds(1));
            const tx = await this.tokenSale.withdrawVestedTokensByTimestamp( timestampOfRequest );
            logs = tx.logs;

            // 1500 tokens are expected to get
            expectEvent.inLogs(logs, 'VestedTokensWithdrawed', {
              timestampOfRequest: timestampOfRequest,
              vestingPeriodStart: this.vestingStart2,
              releaseTime: this.vestingRelease2,
              amount: '500'
            });

            expect(await this.token.balanceOf(this.timeLock1)).to.be.bignumber.equal('1000');
            expect(await this.token.balanceOf(this.timeLock2)).to.be.bignumber.equal('500');
          })
        })

        context('Release of Team Token into VestingContract', function () {

          it('releasing token at the end of 13th month will release 100 token as expected', async function() {

            // lets withdraw team token after the first month

            let timestampOfRequest = this.vestingStart1.add(time.duration.days(31).sub(time.duration.seconds(1)));
            const tokenLockAddress = await this.tokenSale.getTimeLockAddress(timestampOfRequest);
            const vesting = await TokenVesting.at(tokenLockAddress);

            (await vesting.cliff()).should.be.bignumber.equal(this.vestingRelease1);

            expect(await this.token.balanceOf(this.timeLock1)).to.be.bignumber.equal('0');

            await this.tokenSale.withdrawVestedTokensByTimestamp( timestampOfRequest );

            // 1000 token was minted into time lock contract
            expect(await this.token.balanceOf(this.timeLock1)).to.be.bignumber.equal('1000');

            // where any release at current time would be reverted
            await shouldFail.reverting( vesting.release(this.token.address) );

            // Thats why the balance of vesting contract is still zero ...
            expect(await this.token.balanceOf(this.vesting.address)).to.be.bignumber.equal('0');
            // and in the time lock still 1000
            expect(await this.token.balanceOf(this.timeLock1)).to.be.bignumber.equal('1000');

            // but on the 31. day
            await time.increaseTo(this.vestingRelease1.add(time.duration.days(31)));

            // we are about to release 100 vested token
            expect(await vesting.vestedAmount(this.token.address) ).to.be.bignumber.equal('100');

            // so lets do it:
            await vesting.release(this.token.address);

            // Balance of vesting contract is now 100
            expect(await this.token.balanceOf(this.vesting.address)).to.be.bignumber.equal('100');

            // Balance in timelock is now 900
            expect(await this.token.balanceOf(this.timeLock1)).to.be.bignumber.equal('900');
          })

          it('releasing token twice in a month will still get only 10% of total', async function() {
            let timestampOfRequest = this.vestingStart1.add(time.duration.days(4));
            const tokenLockAddress = await this.tokenSale.getTimeLockAddress(timestampOfRequest);
            const vesting = await TokenVesting.at(tokenLockAddress);

            await this.tokenSale.withdrawVestedTokensByTimestamp( timestampOfRequest );

            // Balance of vesting contract is still zero
            expect(await this.token.balanceOf(this.vesting.address)).to.be.bignumber.equal('0');

            // on the 15. day
            await time.increaseTo(this.vestingRelease1.add(time.duration.days(15)));

            expect(await vesting.vestedAmount(this.token.address) ).to.be.bignumber.equal('48');

            await vesting.release(this.token.address);
            // Balance of vesting contract is now 1000
            expect(await this.token.balanceOf(this.vesting.address)).to.be.bignumber.equal('48');

            // Balance in timelock is now zero
            expect(await this.token.balanceOf(this.timeLock1)).to.be.bignumber.equal('952');

            // on the 31th day ...
            await time.increaseTo(this.vestingRelease1.add(time.duration.days(31)));

            expect(await vesting.vestedAmount(this.token.address) ).to.be.bignumber.equal('100');

            // ... the full 10% are in total available after call of release()
            await vesting.release(this.token.address);
            expect(await this.token.balanceOf(this.vesting.address)).to.be.bignumber.equal('100');

            // Balance in timelock is now 900
            expect(await this.token.balanceOf(this.timeLock1)).to.be.bignumber.equal('900');
          })

          it('release token by another is also allowed and okay, because they go into the right account', async function() {
            let timestampOfRequest = this.vestingStart1.add(time.duration.days(4));
            const tokenLockAddress = await this.tokenSale.getTimeLockAddress(timestampOfRequest);
            const vesting = await TokenVesting.at(tokenLockAddress);

            await this.tokenSale.withdrawVestedTokensByTimestamp( timestampOfRequest );

            // Balance of vesting contract is still zero
            expect(await this.token.balanceOf(this.vesting.address)).to.be.bignumber.equal('0');

            await time.increaseTo(this.vestingRelease1.add(time.duration.days(31)));
            await vesting.release(this.token.address, {from: another});

            // Balance of vesting contract is now 100
            expect(await this.token.balanceOf(this.vesting.address)).to.be.bignumber.equal('100');
          })

        });

      });


});