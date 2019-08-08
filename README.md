
# What is it about?

The NCDT-Token are part of the ICO of Nuco.Cloud.

URL: [https://nuco.cloud/](https://nuco.cloud/)

Whitepaper: [https://nuco.cloud/#whitepaper](https://nuco.cloud/#whitepaper)

FAQ: [https://nuco.cloud/#faq](https://nuco.cloud/#faq)

# Deployment Protocol

URL: [DEPLOYMENT.md](https://github.com/itinance/ncd-token/blob/master/DEPLOYMENT.md)

# Getting started

## Prerequisites

Install the following tools globally (or using npx)
- node
- npm
- ganache-cli
- truffle-suite

## Installation

Checkout and intall dependencies

```
git clone git@github.com:nucocloud/ncd-token.git
cd ncd-token
npm install 
```

## Running tests:

1. start ganache

```
ganache-cli --mnemonic “your twelve word mnemonic here”
```

2. In a new terminal, run tests:

```
truffle test
```

# Vesting / Team Tokens


The following rules has been defined for minting Team tokens into a specific vesting contract:

1. Crowdsale goes 12 months
2. Every sold token is doubled into a special vesting contract
3. these vesting tokens can be released 12 months later on a monthly basis, but only 10% each month
4. Within vesting contract multiple people has separate shares into the vesting (some get 20%, some only 1% and so on)

Example:

Month 1 Crowdsale: 100 Token sold
Month 2 Crowdsale: 50 Token sold
Month 3 Crowdsale: 150 token sold

Therefor in the 13th Month can 100 Token get released into the vesting contract, but only 10% can be transfered out of it to wallets of team members

In the 14th Month further 50 Token can get released into the vesting contract, which got in total 150 token yet, which means that 15 token can be withdrewed into team members wallets

In the 15th Month another 150 Token can get released into VC, which got now in total 300 token which means that 30 token can get withdrewed into teams wallets.

And so on .,..


# Known issues in Unit tests

"Cannot increase current time (6214995149) to a moment in the past (6214995148)"

From time to time, in 1 out of 10,11,12... test runs this error is thrown running on ganache-cli. We use quiet offen openzeppelin-test-helpers in order to increase the blockchain timestamp/block height for testing events that will happen in the future. Sometimes, this error is happening then for no known reasons.

