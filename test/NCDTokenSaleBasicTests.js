const { BN, ether, constants, expectEvent, shouldFail, time } = require('openzeppelin-test-helpers');
const { ZERO_ADDRESS } = constants;


const NCDToken = artifacts.require('NCDToken');
const NCDTokenSale = artifacts.require('NCDTokenSaleImpl');


contract("CrowdSale tests basic", async ([_, owner, pauser1, pauser2,  ...otherAccounts]) => {
    let token,
        openingTime, closingTime, afterClosingTime;

    before(async function () {
      // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
      await time.advanceBlock();
    });

    beforeEach(async function () {
        openingTime = (await time.latest()).add(time.duration.weeks(1));
        closingTime = openingTime.add(time.duration.weeks(1));
        afterClosingTime = closingTime.add(time.duration.seconds(1));

        token = await NCDToken.new({from: owner});
        await token.initialize( owner, [pauser1, pauser2]);
    });

    it('reverts if the opening time is in the past', async function () {
      await shouldFail.reverting(NCDTokenSale.new(
        owner, (await time.latest()).sub(time.duration.days(1)), closingTime, token.address
      ));
    });

    it('reverts if the closing time is before the opening time', async function () {
      await shouldFail.reverting(NCDTokenSale.new(
        owner, openingTime, openingTime.sub(time.duration.seconds(1)), token.address
      ));
    });

    it('reverts if the closing time equals the opening time', async function () {
      await shouldFail.reverting(NCDTokenSale.new(
        owner, openingTime, openingTime, token.address
      ));
    });

    it('reverts if the token is a zero address', async function () {
      await shouldFail.reverting(NCDTokenSale.new(
        owner, openingTime, openingTime, ZERO_ADDRESS
      ));
    });

});