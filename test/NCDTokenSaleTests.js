const truffleAssert = require('truffle-assertions');
const { BN, ether, constants, expectEvent, shouldFail, time } = require('openzeppelin-test-helpers');
const should = require('chai').should();
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;

const NCDToken = artifacts.require('NCDToken');

const NCDTokenSale = artifacts.require('NCDTokenSale');

contract("CrowdSale tests", async ([_, owner, pauser1, pauser2,  ...otherAccounts]) => {
    let token, tokenSale,
        openingTime, closingTime, afterClosingTime;

    const buyer = otherAccounts[1];

    before(async function () {
      // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
      await time.advanceBlock();
    });

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
        vestingRelease1 = afterClosingTime.add(time.duration.days(10)),

        vestingStart2 = vestingRelease1.add(time.duration.seconds(1)),
        vestingRelease2 = vestingStart2.add(time.duration.days(10))
        ;

      let {logs} = await tokenSale.addVestingLock(vestingStart1, vestingRelease1);
      expectEvent.inLogs(logs, 'VestingLockAdded', {
        vestingPeriodStart: vestingStart1,
        releaseTime: vestingRelease1,
      });

      const tx = await tokenSale.addVestingLock(vestingStart2, vestingRelease2);
      logs = tx.logs;
      expectEvent.inLogs(logs, 'VestingLockAdded', {
        vestingPeriodStart: vestingStart2,
        releaseTime: vestingRelease2,
      });
    })

    it('token can be minted in the crowdsale', async function() {

        // minting 1000 tokens
        await tokenSale.mintTokens(buyer, 1000);

        const balance = await token.balanceOf(buyer);
        expect(balance).to.be.bignumber.equal('1000');

        // Team Tokens was counted the right way
        expect(await tokenSale.getTeamTokensTotal()).to.be.bignumber.equal('1000');
        expect(await tokenSale.getTeamTokensUnreleased()).to.be.bignumber.equal('1000');
        expect(await tokenSale.getTeamTokensReleased()).to.be.bignumber.equal('0');
    })
});