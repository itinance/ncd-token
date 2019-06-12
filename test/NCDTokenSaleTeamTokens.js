const truffleAssert = require('truffle-assertions');
const { BN, ether, constants, expectEvent, shouldFail, time } = require('openzeppelin-test-helpers');
const should = require('chai').should();
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;

const NCDToken = artifacts.require('NCDToken');

const NCDTokenSale = artifacts.require('NCDTokenSale');



contract("CrowdSale TeamToken tests", async ([_, owner, buyer, another, pauser1, pauser2,  ...otherAccounts]) => {
    let token, tokenSale,

      // Define time range of the crows sale
      openingTime = (await time.latest()).add(time.duration.weeks(1)),
      closingTime = openingTime.add(time.duration.years(1)),
      afterClosingTime = closingTime.add(time.duration.seconds(1)),

    // define vesting periods with a length of 10 days
      vestingStart1 = openingTime,
      vestingRelease1 = vestingStart1.add(time.duration.days(10)),

      vestingStart2 = vestingRelease1.add(time.duration.seconds(1)),
      vestingRelease2 = vestingStart2.add(time.duration.days(10))
    ;

    before(async function () {
      // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
      await time.advanceBlock();
    });

    beforeEach(async function () {
        token = await NCDToken.new({from: owner});
        await token.initialize( owner, [pauser1, pauser2]);

        tokenSale = await NCDTokenSale.new({from: owner});
        await tokenSale.initialize(openingTime, closingTime, token.address);

        await token.addMinter(tokenSale.address, {from: owner});
        await token.renounceMinter({ from: owner });
    });

    context('once deployed', function () {
        beforeEach(async function () {
          // Prepare vesting Locks
          await tokenSale.addVestingLock(vestingStart1, vestingRelease1);
          await tokenSale.addVestingLock(vestingStart2, vestingRelease2);

          await time.increaseTo(openingTime);
          await time.advanceBlock();

          // minting 1000 tokens
          await tokenSale.mintTokens(buyer, 1000);
        });

        it('will find the appropriate TokenTimelock for specific timestamps', async function() {
          const timestamp = vestingStart1.add(time.duration.days(5));

          const result =  await tokenSale.findTokenTimelock(timestamp);

          const periodStart = result[0];
          const releaseTime = result[1];

          expect(periodStart).to.be.bignumber.equal(vestingStart1);
          expect(releaseTime).to.be.bignumber.equal(vestingRelease1);
        });

        it('virtual team tokens are growing as long as not released', async function() {
            let balance = await token.balanceOf(buyer);
            expect(balance).to.be.bignumber.equal('1000');

            // Team Tokens was counted the right way
            expect(await tokenSale.getTeamTokensTotal()).to.be.bignumber.equal('1000');
            expect(await tokenSale.getTeamTokensUnreleased()).to.be.bignumber.equal('1000');
            expect(await tokenSale.getTeamTokensReleased()).to.be.bignumber.equal('0');

            // minting 1000 tokens
            await tokenSale.mintTokens(another, 500);

            balance = await token.balanceOf(another);
            expect(balance).to.be.bignumber.equal('500');

            // Team Tokens was counted the right way
            expect(await tokenSale.getTeamTokensTotal()).to.be.bignumber.equal('1500');
            expect(await tokenSale.getTeamTokensUnreleased()).to.be.bignumber.equal('1500');
            expect(await tokenSale.getTeamTokensReleased()).to.be.bignumber.equal('0');
        })
    })



});