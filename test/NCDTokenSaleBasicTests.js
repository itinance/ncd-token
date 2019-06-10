const { BN, ether, constants, expectEvent, shouldFail, time } = require('openzeppelin-test-helpers');
const { ZERO_ADDRESS } = constants;


const NCDToken = artifacts.require('NCDToken');
const NCDTokenSale = artifacts.require('NCDTokenSaleImpl');

contract("CrowdSale tests basic", async ([_, owner, pauser1, pauser2,  ...otherAccounts]) => {
    let token, tokenSale,
        openingTime, closingTime, afterClosingTime;

    const buyer = otherAccounts[1];
    const notAMinter = otherAccounts[2];

    const notAPauser = otherAccounts[1];

    beforeEach(async function () {
        openingTime = await time.latest();
        closingTime = openingTime.add(time.duration.weeks(1));
        afterClosingTime = closingTime.add(time.duration.seconds(1));

        token = await NCDToken.new({from: owner});
        token.initialize( owner, [pauser1, pauser2]);
    });

    it('reverts if the opening time is in the past', async function () {
      await shouldFail.reverting(NCDTokenSale.new(
        (await time.latest()).sub(time.duration.days(1)), closingTime, token.address
      ));
    });

    it('reverts if the closing time is before the opening time', async function () {
      await shouldFail.reverting(NCDTokenSale.new(
        openingTime, openingTime.sub(time.duration.seconds(1)), token.address
      ));
    });

    it('reverts if the closing time equals the opening time', async function () {
      await shouldFail.reverting(NCDTokenSale.new(
        openingTime, openingTime, token.address
      ));
    });

    it('reverts if the token is a zero address', async function () {
      await shouldFail.reverting(NCDTokenSale.new(
        openingTime, openingTime, ZERO_ADDRESS
      ));
    });

});