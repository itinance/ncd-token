const truffleAssert = require('truffle-assertions');
const { BN, ether, constants, expectEvent, shouldFail, time } = require('openzeppelin-test-helpers');
const should = require('chai').should();
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;

const NCDToken = artifacts.require('NCDToken');
const NCDTokenSale = artifacts.require('NCDTokenSaleImpl');

const NCDTokenSale_ = artifacts.require('NCDTokenSale');


contract("CrowdSale tests", async ([_, owner, pauser1, pauser2,  ...otherAccounts]) => {
    let token, tokenSale,
        openingTime, closingTime, afterClosingTime;

    const buyer = otherAccounts[1];

    beforeEach(async function () {
        token = await NCDToken.new({from: owner});
        await token.initialize( owner, [pauser1, pauser2]);

        openingTime = await time.latest();
        closingTime = openingTime.add(time.duration.years(1));
        afterClosingTime = closingTime.add(time.duration.seconds(1));

        console.log(1, openingTime.toString())
        console.log(2, closingTime.toString());
        console.log(3, afterClosingTime.toString());
        console.log(4, token.address);


        //tokenSale = await NCDTokenSale.new(openingTime, closingTime, token.address, {from: owner});
        tokenSale = await NCDTokenSale_.new({from: owner});
        await tokenSale.initialize(openingTime, closingTime, token.address);


        console.log(5)

        await token.addMinter(tokenSale.address, {from: owner});
        await token.renounceMinter({ from: owner });

        console.log(7)

    });


//    describe("Initiating token sale", function() {

        it('crowdsale should be minter', async function () {
          (await token.isMinter(tokenSale.address)).should.equal(true);
        });

        it('owner should not be minter anymore', async function () {
          (await token.isMinter(owner)).should.equal(false);
        });

        it('Timelock can be added', async function() {
          await tokenSale.addTimelock(afterClosingTime);
        })

        it('token can be minted in the crowdsale', async function() {
            await tokenSale.mintTokens(buyer, 1000);

            const balance = await token.balanceOf(buyer);
            expect(balance).to.be.bignumber.equal('1000');
        })
//    })


});