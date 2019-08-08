const truffleAssert = require('truffle-assertions');
const { BN, ether, constants, expectEvent, shouldFail, time } = require('openzeppelin-test-helpers');
const should = require('chai').should();
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;

const TokenVesting = artifacts.require("TokenVestingImpl");
const NCDToken = artifacts.require('NCDTokenImpl');
const NCDTokenSale = artifacts.require('NCDTokenSaleImpl');

const ONE_YEAR_IN_SECONDS = 86400 * 31 * 12; // SIMPLIFIED FOR our tests here (31 days per month)
const ONE_MONTH_PERIOD_IN_SECONDS = 86400 * 31; // 31 days for a ideal month
const RELEASE_RATE_PER_MONTH = 10;


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

      // this array contains 12 vesting periods for every month a simulated ICO
      this.vestingPeriods = [];

      // holds all timelocks for every vesting period
      this.timeLocks = [];

      // This table was taken from NCDTeamTokenIntegrationTest.js

      // this array contains tokens that would be bought during an ICO over 12 months. Every month has a entry with the amount
      this.tokensBought = [
        {bought: 200, expectedBeingReleased: 20}, // 1. Month        180 left   20 vested+relased
        {bought: 100, expectedBeingReleased: 20+10}, // 2. Month     250 left   50 vested+relased
        {bought:  0, expectedBeingReleased: 20+10},  // 3. Month     220 left   80 vested+relased
        {bought:  0, expectedBeingReleased: 20+10}, // 4. Month      190 left   110 vested+relased
        {bought:  0, expectedBeingReleased: 20+10}, // 5. Month      160 left   140 vested+relased
        {bought:  0, expectedBeingReleased: 20+10}, // 6. Month      130 left   170 vested+relased
        {bought:  0, expectedBeingReleased: 20+10}, // 7. Month      100 left   200 vested+relased
        {bought:  0, expectedBeingReleased: 20+10}, // 8. Month      70 left    230 vested+released
        {bought:  0, expectedBeingReleased: 20+10}, // 9. Month      40 left    260 vested+released
        {bought:  0, expectedBeingReleased: 20+10}, // 10. Month     10 left    290 vested+released
        {bought:  0, expectedBeingReleased: 30},    // 11. Month      0 left    300 vested+released
        {bought:  0, expectedBeingReleased: 30},     // 12. Month      0 left
      ];

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

            if(amount > 0) {
              await this.tokenSale.withdrawVestedTokens();
              const vesting = await TokenVesting.at(this.timeLocks[month]);
              await shouldFail.reverting( vesting.release(this.token.address) );
  
              saldo += amount;
              expect(await this.token.balanceOf(timeLock)).to.be.bignumber.equal( amount.toString() );
            } else {
              // we expect a revert because no more tokens for this month can be withdrawn
              await shouldFail.reverting( this.tokenSale.withdrawVestedTokens() );
            }

          };

          await time.advanceBlock();

          expect(saldo).to.equal(300);
        });

        it('has minted all tokens', async function() {
          expect(await this.token.balanceOf(buyer)).to.be.bignumber.equal('300');
        })

        it('has registered all team tokens', async function() {
          expect(await this.tokenSale.getTeamTokensTotal()).to.be.bignumber.equal('300');
        })

        context('one year later', function() {
          beforeEach(async function () {
              await time.advanceBlock();
          });

          it('we can release tokens monthly with 10% rate', async function() {

            // Month 1

            let month = 0;
            let tokenVesting = await TokenVesting.at(this.timeLocks[month]);

            expect( await this.token.balanceOf(tokenVesting.address) ).to.be.bignumber.equal( '200' );

            let date = this.vestingPeriods[month].start;
            await time.increaseTo(date.add(this.cliffDuration).add(time.duration.days(31)));
            await tokenVesting.release(this.token.address);

            expect( await this.token.balanceOf(vesting) ).to.be.bignumber.equal( '20' );
            expect( await this.token.balanceOf(tokenVesting.address) ).to.be.bignumber.equal( '180' );

            // Month 2

            month = 1;
            let tokenVesting2 = await TokenVesting.at(this.timeLocks[month]);
            expect( await this.token.balanceOf(tokenVesting2.address) ).to.be.bignumber.equal( '100' );

            date = this.vestingPeriods[month].start;
            await time.increaseTo(date.add(this.cliffDuration).add(time.duration.days(31)));

            await tokenVesting2.release(this.token.address);

            expect( await this.token.balanceOf(vesting) ).to.be.bignumber.equal( '30' );
            expect( await this.token.balanceOf(tokenVesting.address) ).to.be.bignumber.equal( '180' );

            await tokenVesting.release(this.token.address);

            expect( await this.token.balanceOf(vesting) ).to.be.bignumber.equal( '50' );
            expect( await this.token.balanceOf(tokenVesting.address) ).to.be.bignumber.equal( '160' );

            expect( await this.token.balanceOf(tokenVesting2.address) ).to.be.bignumber.equal( '90' );

            // Month 3

            month = 2;
            let tokenVesting3 = await TokenVesting.at(this.timeLocks[month]);
            date = this.vestingPeriods[month].start;

            await time.increaseTo(date.add(this.cliffDuration).add(time.duration.days(31)));
            await shouldFail.reverting( tokenVesting3.release(this.token.address) );
            expect( await this.token.balanceOf(tokenVesting3.address) ).to.be.bignumber.equal( '0' );

            expect( await this.token.balanceOf(vesting) ).to.be.bignumber.equal( '50' ); // still 50

            await tokenVesting2.release(this.token.address);
            expect( await this.token.balanceOf(tokenVesting2.address) ).to.be.bignumber.equal( '80' );
            expect( await this.token.balanceOf(vesting) ).to.be.bignumber.equal( '60' ); 
            await tokenVesting.release(this.token.address);
            expect( await this.token.balanceOf(tokenVesting.address) ).to.be.bignumber.equal( '140' );

            expect( await this.token.balanceOf(vesting) ).to.be.bignumber.equal( '80' ); 

            // Month 4

            month = 3;
            let tokenVesting4 = await TokenVesting.at(this.timeLocks[month]);
            date = this.vestingPeriods[month].start;

            await time.increaseTo(date.add(this.cliffDuration).add(time.duration.days(31)));
            await shouldFail.reverting( tokenVesting4.release(this.token.address) );
            expect( await this.token.balanceOf(tokenVesting4.address) ).to.be.bignumber.equal( '0' );
            await shouldFail.reverting( tokenVesting3.release(this.token.address) );
            expect( await this.token.balanceOf(tokenVesting3.address) ).to.be.bignumber.equal( '0' );

            expect( await this.token.balanceOf(vesting) ).to.be.bignumber.equal( '80' ); // still 50

            await tokenVesting2.release(this.token.address);
            expect( await this.token.balanceOf(tokenVesting2.address) ).to.be.bignumber.equal( '70' );
            expect( await this.token.balanceOf(vesting) ).to.be.bignumber.equal( '90' ); 
            await tokenVesting.release(this.token.address);
            expect( await this.token.balanceOf(tokenVesting.address) ).to.be.bignumber.equal( '120' );

            expect( await this.token.balanceOf(vesting) ).to.be.bignumber.equal( '110' ); 

          })
        })
    });
});