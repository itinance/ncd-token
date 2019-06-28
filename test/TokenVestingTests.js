const truffleAssert = require('truffle-assertions');
const { BN, constants, expectEvent, shouldFail, time } = require('openzeppelin-test-helpers');
const should = require('chai').should();

const TokenVesting = artifacts.require('TokenVesting');


contract("TokenVesting", async ([_, owner, beneficiary, ...otherAccounts]) => {

    const amount = new BN('1000');

    beforeEach(async function () {

      // +1 minute so it starts after contract instantiation
      this.start = (await time.latest()).add(time.duration.minutes(1));
      this.cliffDuration = time.duration.years(1);
      this.periodLength = time.duration.days(31);
      this.periodRate = 10;
    });

    it('works', function() {
        console.log(3);
    });

    context('once deployed', function () {

        beforeEach(async function () {
            this.vesting = await TokenVesting.new();
            await this.vesting.initialize(beneficiary, this.start, this.cliffDuration, this.periodLength, this.periodRate, true, owner);
        });

        it("can get state", async function() {
            (await this.vesting.beneficiary()).should.be.equal(beneficiary);
            (await this.vesting.cliff()).should.be.bignumber.equal(this.start.add(this.cliffDuration));
            (await this.vesting.start()).should.be.bignumber.equal(this.start);

            (await this.vesting.periodLength()).should.be.bignumber.equal(this.periodLength);
            (await this.vesting.periodRate()).should.be.bignumber.equal(this.periodRate.toString());
            (await this.vesting.revocable()).should.be.equal(true);
            (await this.vesting.owner()).should.be.equal(owner);
        });

    })

});