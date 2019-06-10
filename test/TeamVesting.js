const truffleAssert = require('truffle-assertions');
const { BN, constants, expectEvent, shouldFail } = require('openzeppelin-test-helpers');
const should = require('chai').should();

const TeamVesting = artifacts.require('TeamVesting');

contract("TeamVesting", async ([_, owner, ...otherAccounts]) => {
    let vesting;

    const vestor1 = otherAccounts[0];
    const vestor2 = otherAccounts[1];

    const otherNotVesting = otherAccounts[2];

    beforeEach(async function () {
        vesting = await TeamVesting.new({from: owner});
        await vesting.initialize(owner);
        await vesting.addBeneficiaries([vestor1, vestor2], [93, 7], {from: owner});
    });

    it("the calculated value for vested tokens is right", async () => {
        assert.equal( await vesting.calcVestingAmount(vestor1, 100), 93 );
        assert.equal( await vesting.calcVestingAmount(vestor2, 100), 7 );
        assert.equal( await vesting.calcVestingAmount(otherNotVesting, 100), 0 );
    });

    it("vesting was correctly initialized", async () => {
        assert.isTrue(await vesting.isVesting(vestor1) );
        assert.isTrue(await vesting.isVesting(vestor2) );
        assert.isFalse(await vesting.isVesting(otherNotVesting) );

        await vesting.removeBeneficiary(vestor1, {from: owner});

        assert.isFalse(await vesting.isVesting(vestor1) );
        assert.isTrue(await vesting.isVesting(vestor2) );
        assert.isFalse(await vesting.isVesting(otherNotVesting) );
    });

    it("vestor can be removed successfully", async () => {
        await vesting.removeBeneficiary(vestor1, {from: owner});

        assert.isFalse(await vesting.isVesting(vestor1) );
        assert.isTrue(await vesting.isVesting(vestor2) );
        assert.isFalse(await vesting.isVesting(otherNotVesting) );
    });


});