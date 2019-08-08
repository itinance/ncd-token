const truffleAssert = require('truffle-assertions');
const { BN, ether, constants, expectEvent, shouldFail, time } = require('openzeppelin-test-helpers');
const should = require('chai').should();
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;

const TokenVesting = artifacts.require("TokenVestingImpl");
const NCDToken = artifacts.require('NCDTokenImpl');
const NCDTokenSale = artifacts.require('NCDTokenSaleImpl');

const ONE_YEAR_IN_SECONDS = 86400 * 31 * 12;
const ONE_MONTH_PERIOD_IN_SECONDS = 86400 * 31; // 31 days for a ideal month
const RELEASE_RATE_PER_MONTH = 10;

return;
contract("TeamToken Integration tests", async ([_, owner, buyer, another, vesting, pauser1, pauser2, vestor1, vestor2, ...otherAccounts]) => {

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

      // this array contains 12 versting periods for every month a simulated ICO
      this.vestingPeriods = [];

      // holds all timelocks for every vesting period
      this.timeLocks = [];

      // this array contains tokens that would be bought during an ICO over 12 months. Every month has a entry wizh the amount
      this.tokensBought = [
        {bought: 100, expectedBeingReleased: 10}, // 1. Month
        {bought: 200, expectedBeingReleased: 10+20}, // 2. Month
        {bought:  60, expectedBeingReleased: 10+20+6},  // 3. Month
        {bought: 300, expectedBeingReleased: 10+20+6+30}, // 4. Month
        {bought: 150, expectedBeingReleased: 10+20+6+30+15}, // 5. Month
        {bought: 220, expectedBeingReleased: 10+20+6+30+15+22}, // 6. Month
        {bought: 300, expectedBeingReleased: 10+20+6+30+15+22+30}, // 7. Month
        {bought: 160, expectedBeingReleased: 10+20+6+30+15+22+30+16}, // 8. Month
        {bought:  50, expectedBeingReleased: 10+20+6+30+15+22+30+16+5},  // 9. Month
        {bought: 120, expectedBeingReleased: 10+20+6+30+15+22+30+16+5+12}, // 10. Month
        {bought: 240, expectedBeingReleased: 10+20+6+30+15+22+30+16+5+12+24}, // 11. Month
        {bought: 210, expectedBeingReleased: 10+20+6+30+15+22+30+16+5+12+24+21}, // 12. Month
      ];

      //this.totalTokens = this.tokensBought => arr.reduce((a,b) => a + b, 0);

      let start = this.openingTime;

      // create the token
      this.token = await NCDToken.new(owner, [pauser1, pauser2], {from: owner});

      // create the token sale contract
      this.tokenSale = await NCDTokenSale.new(owner, this.openingTime, this.closingTime, this.token.address, {from: owner});

      // make it the one and only minter
      await this.token.addMinter(this.tokenSale.address, {from: owner});
      await this.token.renounceMinter({ from: owner });

      // define 12 vesting periods
      for(let i = 0; i < 12; ++i) {
        const vestingPeriod = {
          start: start,
          release: start.add(this.cliffDuration)
        }
        this.vestingPeriods.push(vestingPeriod);

        const tokenVesting = await TokenVesting.new(vesting, start, ONE_YEAR_IN_SECONDS, ONE_MONTH_PERIOD_IN_SECONDS, RELEASE_RATE_PER_MONTH, owner);

        await this.tokenSale.addVestingLock(start,  tokenVesting.address, {from: owner});
        this.timeLocks[i] = await this.tokenSale.getTimeLockAddress(start);

        start = start.add(this.periodLength);
      }

      await time.increaseTo(this.openingTime);
      await time.advanceBlock();
    });

    it('vesting periods are well defined', async function() {
      let start = this.openingTime;
      let addresses = [];
      for(let i = 0; i < 12; ++i) {
        const release = start.add(this.cliffDuration)

        const timeLockData = await this.tokenSale.findTokenTimelock(start);

        expect(timeLockData[0]).to.be.bignumber.equal(start); // start of period
        expect(timeLockData[1]).to.be.bignumber.equal(release); // periodLength

        expect(timeLockData[0]).to.be.bignumber.equal(this.vestingPeriods[i].start); // start of period
        expect(timeLockData[1]).to.be.bignumber.equal(this.vestingPeriods[i].release); // periodLength

        // ensure that every timelock has its own address
        const address = timeLockData[2];
        expect(addresses.indexOf(address)).to.equal(-1);

        addresses.push(address);

        start = start.add(this.periodLength);
      }
    })


    context('once token was bought', function () {

      
        beforeEach(async function () {
          console.log("Starting one-year-simulation");

          await time.advanceBlock();

          let saldo = 0;

          for(let month = 0; month < 12; month++) {
            const amount = this.tokensBought[month].bought;

            // console.log("- month " + month + ': minting ' + amount + ' token');

            // move forward to beginning of month
            const date = this.vestingPeriods[month].start;

            await time.increaseTo(date);
            await time.advanceBlock();
            await this.tokenSale.mintTokens(buyer, amount, {from: owner});

            // move forward to end of the month

            await time.increaseTo(date.add(time.duration.days(4)));

            // and withdraw vested tokens
            const timeLock = this.timeLocks[month];

            expect(await this.token.balanceOf(timeLock)).to.be.bignumber.equal( '0' );
            await this.tokenSale.withdrawVestedTokens();

            const vesting = await TokenVesting.at(timeLock);
            await shouldFail.reverting( vesting.release(this.token.address) );

            /*for(let i = 0; i < 12; ++i) {
              console.log(i, this.timeLocks[i], (await this.token.balanceOf(this.timeLocks[i])).toString() );
            }*/

            saldo += amount;
            expect(await this.token.balanceOf(timeLock)).to.be.bignumber.equal( amount.toString() );

            //let vestingSaldo = await calcSaldoAcrossAllVestingContracts(this)
            //console.log(month, vestingSaldo.toString());
          };

          await time.advanceBlock();

          expect(saldo).to.equal(2110);
        });

        it('has minted all tokens', async function() {
          expect(await this.token.balanceOf(buyer)).to.be.bignumber.equal('2110');
        })

        it('has registered all team tokens', async function() {
          expect(await this.tokenSale.getTeamTokensTotal()).to.be.bignumber.equal('2110');
        })

        it('has registered all vesting tokens across all vesting contracts', async function() {
          let vestingSaldo = await calcSaldoAcrossAllVestingContracts(this);
          expect(await vestingSaldo).to.be.bignumber.equal('2110');
      })

        context('one year later', function() {
          beforeEach(async function () {
              await time.advanceBlock();
          });

          it('we can release tokens monthly with 10% rate for all 12 months', async function() {

            let releasable = 0;
            for(let month = 0; month < 12; month++) {
                const date = this.vestingPeriods[month].start;
                const tokenVesting = await TokenVesting.at(this.timeLocks[month]);

                await time.increaseTo(date.add(this.cliffDuration).add(time.duration.days(31)));

                const balanceOfTimeLockBeforeRelease = await this.token.balanceOf(tokenVesting.address);

                await tokenVesting.release(this.token.address);

                const expectedToReleasePerSingleMonth = this.tokensBought[month].bought * 0.1;
                const expectedBeingReleased = this.tokensBought[month].expectedBeingReleased;

                const balanceOfTimeLock = await this.token.balanceOf(tokenVesting.address);

                console.log(month, balanceOfTimeLockBeforeRelease.toString(), expectedBeingReleased.toString());

                // Balance of this current timelock was decreased by currents monthly expected rate per this timelock in this month
                expect( balanceOfTimeLock ).to.be.bignumber.equal(balanceOfTimeLockBeforeRelease.sub(new BN(expectedToReleasePerSingleMonth) ) );

                releasable += expectedToReleasePerSingleMonth
                console.log(month, balanceOfTimeLockBeforeRelease.toString(), balanceOfTimeLock.toString(), 
                  ':', expectedToReleasePerSingleMonth, expectedBeingReleased, releasable, (await this.token.balanceOf(vesting)).toString());

                // Global vesting address gets all released tokens in
                expect( await this.token.balanceOf(vesting) ).to.be.bignumber.equal( expectedBeingReleased.toString() );
                expect( await this.token.balanceOf(vesting) ).to.be.bignumber.equal( releasable.toString() );
              }

            //await tokenVesting.release(this.token.address);
            //expect(await this.token.balanceOf(vesting)).to.be.bignumber.equal('10');
          })
        })
    });
});

async function calcSaldoAcrossAllVestingContracts(self) {
  let vestingSaldo = new BN(0);
  for(let m = 0; m < 12; m++) {
    if(typeof self.timeLocks[m] !== 'string') continue;
    const vesting = await TokenVesting.at(self.timeLocks[m]);
    const saldo = await self.token.balanceOf(vesting.address);
    vestingSaldo = vestingSaldo.add(saldo);
  }
  return vestingSaldo;
}