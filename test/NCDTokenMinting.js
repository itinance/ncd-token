const truffleAssert = require('truffle-assertions');
const { BN, constants, expectEvent, shouldFail } = require('openzeppelin-test-helpers');
const should = require('chai').should();

const NCDToken = artifacts.require('NCDTokenImpl');

contract("NCDTokenMinting", async ([_, owner, ...otherAccounts]) => {
    let token;

    const minter1 = otherAccounts[0];
    const minter2 = otherAccounts[1];

    const notAMinter = otherAccounts[2];

    const pauser1 = otherAccounts[2];
    const pauser2 = otherAccounts[3];

    const notAPauser = otherAccounts[1];

    const beneficiary = otherAccounts[4];

    beforeEach(async function () {
        token = await NCDToken.new(minter1, [pauser1, pauser2], {from: owner});
    });

    it("minting works generally", async () => {
        assert.isTrue( await token.balanceOf(beneficiary) == 0 );
        assert.isTrue( await token.totalSupply() == 0 );
        (await token.mint(beneficiary, 100, {from: minter1}));
        assert.isTrue( await token.balanceOf(beneficiary) == 100 );
        assert.isTrue( await token.totalSupply() == 100 );
    });

    it("minting works only when not paused", async () => {
        await token.pause({from: pauser1});
        assert.isTrue( await token.paused() );
        await truffleAssert.reverts( token.mint(beneficiary, 100, {from: minter1}) );
    });

    it("minting works only for minter role", async () => {
        await truffleAssert.reverts( token.mint(beneficiary, 100, {from: notAMinter}) );
    });

});