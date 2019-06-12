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
    })



});