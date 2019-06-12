const truffleAssert = require('truffle-assertions');
const { BN, constants, expectEvent, shouldFail } = require('openzeppelin-test-helpers');
const should = require('chai').should();
const { expect } = require('chai');

const NCDToken = artifacts.require('NCDToken');

contract("NCDToken", async ([_, owner, minter, pauser1, pauser2, ...otherAccounts]) => {
    let token;

    const buyer = otherAccounts[1];
    const notAMinter = otherAccounts[2];
    const notAPauser = otherAccounts[1];

    beforeEach(async function () {
        token = await NCDToken.new({from: owner});
        await token.initialize( minter, [pauser1, pauser2]);
    });

    it("it can be paused by Pauser 1", async () => {
        (await token.pause({from: pauser1}));
        assert.isTrue( await token.paused() );
        (await token.unpause({from: pauser1}));
        assert.isFalse( await token.paused() );
    });

    it("it can be paused by Pauser 2", async () => {
        (await token.pause({from: pauser2}));
        assert.isTrue( await token.paused() );
        (await token.unpause({from: pauser2}));
        assert.isFalse( await token.paused() );
    });

    it("it can not be paused by a Not-Pauser", async () => {
        // ensure that the contract is not paused yet
        assert.isFalse( await token.paused() );
        // try to pause from wrong person will be reverted
        await truffleAssert.reverts(token.pause({from: notAPauser}));
        // ensure that the contract is still not paused yet
        assert.isFalse( await token.paused() );
    });

    it("it can not be un-paused by a Not-Pauser", async () => {
        (await token.pause({from: pauser2}));
        // ensure that the contract is paused yet
        assert.isTrue( await token.paused() );
        // try to pause from wrong person will be reverted
        await truffleAssert.reverts(token.unpause({from: notAPauser}));
        // ensure that the contract is still paused
        assert.isTrue( await token.paused() );
    });

    it("Minter can mint tokens", async () => {
        let balance = await token.balanceOf(buyer);
        expect(balance).to.be.bignumber.equal('0');

        (await token.mint(buyer, 1000, {from: minter}));

        balance = await token.balanceOf(buyer);
        expect(balance).to.be.bignumber.equal('1000');
    });

    it("Minting will revert if it was called by a non-minter", async () => {
        await truffleAssert.reverts(token.mint(buyer, 1000, {from: notAMinter}));
    });

    it("Minter can't mint tokens when token was paused", async () => {
        (await token.pause({from: pauser1}));
        await truffleAssert.reverts(token.mint(buyer, 1000, {from: minter}));

        // minting can be resumed after unpausing
        (await token.unpause({from: pauser2}));

        let balance = await token.balanceOf(buyer);
        expect(balance).to.be.bignumber.equal('0');

        await token.mint(buyer, 1000, {from: minter});

        balance = await token.balanceOf(buyer);
        expect(balance).to.be.bignumber.equal('1000');
    });

    it("Another Minter can be added and will be able to mint then", async () => {
        await truffleAssert.reverts(token.mint(buyer, 1000, {from: notAMinter}));

        await token.addMinter(notAMinter, {from: minter});

        let balance = await token.balanceOf(buyer);
        expect(balance).to.be.bignumber.equal('0');

        await token.mint(buyer, 1000, {from: notAMinter});

        balance = await token.balanceOf(buyer);
        expect(balance).to.be.bignumber.equal('1000');
    });

});