const truffleAssert = require('truffle-assertions');
const { BN, constants, expectEvent, shouldFail, time } = require('openzeppelin-test-helpers');
const { ZERO_ADDRESS } = constants;
const should = require('chai').should();

const TokenVesting = artifacts.require('TokenVesting');
const NCDToken = artifacts.require('NCDToken');

contract("TokenVesting", async ([_, owner, beneficiary, pauser, ...otherAccounts]) => {

    const amount = new BN('1000');

    beforeEach(async function () {
      // +1 minute so it starts after contract instantiation
      this.start = (await time.latest()).add(time.duration.minutes(1));
      this.cliffDuration = time.duration.years(1);
      this.periodLength = time.duration.days(31);
      this.periodRate = 10;
    });

    it('reverts with a null beneficiary', async function () {
        const vesting = await TokenVesting.new();
        await shouldFail.reverting(vesting.initialize(ZERO_ADDRESS, this.start, this.cliffDuration, this.periodLength, this.periodRate, owner, ZERO_ADDRESS));
    });

    it('reverts with a null duration', async function () {
        const vesting = await TokenVesting.new();
        // cliffDuration should also be 0, since the duration must be larger than the cliff
        await shouldFail.reverting(vesting.initialize(beneficiary, this.start, 0, 0, this.periodRate, owner, ZERO_ADDRESS));
    });

    it('reverts if the end time is in the past', async function () {
        const now = await time.latest();
        const vesting = await TokenVesting.new();

        this.start = now.sub(this.cliffDuration).sub(time.duration.minutes(1));
        await shouldFail.reverting(
            vesting.initialize(beneficiary, this.start, this.cliffDuration, this.periodLength, this.periodRate, owner, ZERO_ADDRESS )
        );
    });


    context('once deployed', function () {

        beforeEach(async function () {
            this.vesting = await TokenVesting.new();
            await this.vesting.initialize(beneficiary, this.start, this.cliffDuration, this.periodLength, this.periodRate, owner, ZERO_ADDRESS);

            this.token = await NCDToken.new({from: owner});
            await this.token.initialize( owner, [pauser]);
            await this.token.mint(this.vesting.address, amount, { from: owner });
        });

        it("can get state", async function() {
            (await this.vesting.beneficiary()).should.be.equal(beneficiary);
            (await this.vesting.cliff()).should.be.bignumber.equal(this.start.add(this.cliffDuration));
            (await this.vesting.start()).should.be.bignumber.equal(this.start);

            (await this.vesting.periodLength()).should.be.bignumber.equal(this.periodLength);
            (await this.vesting.periodRate()).should.be.bignumber.equal(this.periodRate.toString());
            (await this.vesting.owner()).should.be.equal(owner);
        });

        it('cannot be released before cliff', async function () {
            await shouldFail.reverting(this.vesting.release(this.token.address));
        });

        it('can be released after cliff', async function () {
            await time.increaseTo(this.start.add(this.cliffDuration).add(time.duration.weeks(1)));
            const { logs } = await this.vesting.release(this.token.address);
            expectEvent.inLogs(logs, 'TokensReleased', {
              token: this.token.address,
              amount: await this.token.balanceOf(beneficiary),
            });
        });

        it('should release proper amount after cliff', async function () {
            // at the end of the first month after cliff
            await time.increaseTo(this.start.add(this.cliffDuration).add(this.periodLength));

            await this.vesting.release(this.token.address);

            const releasedAmount = '100'; // 10 Percent of the 1000 token
            (await this.token.balanceOf(beneficiary)).should.bignumber.equal(releasedAmount);
            (await this.vesting.released(this.token.address)).should.bignumber.equal(releasedAmount);
        });

        it('should release proper amount after cliff at middle of second month period', async function () {
            // in the middle of the first second after cliff
            await time.increaseTo(this.start.add(this.cliffDuration).add(this.periodLength).add(this.periodLength.div(new BN(2))));

            await this.vesting.release(this.token.address);

            const releasedAmount = '150'; // 10 + 5 Percent of the 1000 token
            (await this.token.balanceOf(beneficiary)).should.bignumber.equal(releasedAmount);
            (await this.vesting.released(this.token.address)).should.bignumber.equal(releasedAmount);
        });

        it('should release proper amount after cliff at end of second month period', async function () {
            // at the end of the current month
            await time.increaseTo(this.start.add(this.cliffDuration).add(this.periodLength).add(this.periodLength));

            await this.vesting.release(this.token.address);

            const releasedAmount = '200'; // 20 Percent of the 1000 token
            (await this.token.balanceOf(beneficiary)).should.bignumber.equal(releasedAmount);
            (await this.vesting.released(this.token.address)).should.bignumber.equal(releasedAmount);
        });

    })

});