const truffleAssert = require('truffle-assertions');
const { BN, constants, expectEvent, shouldFail, time } = require('openzeppelin-test-helpers');
const { ZERO_ADDRESS } = constants;
const should = require('chai').should();

const TokenVesting = artifacts.require('TokenVestingImpl');
const NCDToken = artifacts.require('NCDTokenImpl');
const NCDTokenSale = artifacts.require('NCDTokenSaleImpl');

const ONE_YEAR_IN_SECONDS = 86400 * 31 * 12;
const ONE_MONTH_PERIOD_IN_SECONDS = 86400 * 31; // 31 days for a ideal month
const RELEASE_RATE_PER_MONTH = 10;

contract("TokenVesting", async ([_, owner, buyer, another, vesting, pauser1, pauser2, vestor1, vestor2, ...otherAccounts]) => {

    const amount = new BN('1000');

    beforeEach(async function () {
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
  
        // this array contains tokens that would be bought during an ICO over 12 months. Every month has a entry with an amount
        this.tokensBought = [
          {bought: 200, expectedBeingReleased: 20},         // 1. Month
          {bought: 100, expectedBeingReleased: 20+20+10},   // 2. Month
          {bought: 0, expectedBeingReleased: 20+20+10},     // 3. Month
        ];
  
      });

    context('once deployed', function () {

        beforeEach(async function () {
            let start = this.openingTime;

            // create the token
            this.token = await NCDToken.new(owner, [pauser1, pauser2], {from: owner});

            // create the token sale contract
            this.tokenSale = await NCDTokenSale.new(owner, this.openingTime, this.closingTime, this.token.address, {from: owner});

            // make it the one and only minter
            await this.token.addMinter(this.tokenSale.address, {from: owner});

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

        context('once token was bought', function () {
            beforeEach(async function () {
            });

            it('will make vesting work one year later', async function() {

                for(let month = 0; month < this.tokensBought.length; month++) {
                    const amount = this.tokensBought[month].bought;
        
                    console.log("- month " + month + ': minting ' + amount + ' token');
        
                    // move forward to beginning of month
                    const date = this.vestingPeriods[month].start;
        
                    console.log("##", month, date.toString());
                    await time.increaseTo(date);
                    await time.advanceBlock();
    
                    await this.tokenSale.mintTokens(buyer, amount, {from: owner});

                    // move forward to end of the month
                    await time.increaseTo(date.add(new BN(ONE_MONTH_PERIOD_IN_SECONDS-1)));

                    if(amount > 0) {
                        await this.tokenSale.withdrawVestedTokens();
                    }

                };    


                for(let month = 0; month < this.tokensBought.length; month++) {

                    const date = this.vestingPeriods[month].start;
                    const dateVesting = this.vestingPeriods[month].start.add(new BN(ONE_YEAR_IN_SECONDS + ONE_MONTH_PERIOD_IN_SECONDS - 1));
                    console.log("!##", month, dateVesting.toString());

                    await time.increaseTo(dateVesting);

                    const timeLock = await this.tokenSale.getTimeLockAddress(date);
                    const tokenVesting = await TokenVesting.at(timeLock);
                    console.log(tokenVesting.address);

                    try {
                        await tokenVesting.release(this.token.address);
                    } catch(e) {
                        //console.log(e);
                    }
                }
            });
        });    
    })
});