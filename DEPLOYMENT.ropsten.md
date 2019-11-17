# Deployment protocoll

## Ropsten Testnet

Given addresses on Ropsten:

*Owner* is used in NCDTokenSale.
*Minter* is used for initial Minter-Role in NCDToken-Contract.

```
// owner: 0x2353e45fF9613cFB05CC797E15cC37fd0d7F9658
// minter: 0x2353e45fF9613cFB05CC797E15cC37fd0d7F9658
// pauser: 0x2353e45fF9613cFB05CC797E15cC37fd0d7F9658
// pauser: 0x2353e45fF9613cFB05CC797E15cC37fd0d7F9658
```

### Deployment of NCDToken-contract

```
? Pick a contract to instantiate NCDToken
All contracts are up to date
? Do you want to call a function on the instance after creating it? Yes
? Select which function * initialize(minter: address, pausers: address[])
? minter (address): 0x2353e45fF9613cFB05CC797E15cC37fd0d7F9658
? pausers (address[]): [0x2353e45fF9613cFB05CC797E15cC37fd0d7F9658,0x2353e45fF9613cFB05CC797E15cC37fd0d7F9658]
✓ Setting everything up to create contract instances
✓ Instance created at 0x5cB51E5f6a6a6807531a856BDd7972ce44eFC702
0x5cB51E5f6a6a6807531a856BDd7972ce44eFC702
```

### Deployment of NCDTokenSale-contract


Unix-Timestamps generated at: https://www.unixtimestamp.com/index.php

*Opening Time*: 23th May 2019, 00:00:00
```
Unix-TimeStamp: 1558569600
2019-05-23T00:00:00+00:00 in ISO 8601
Thu, 23 May 2019 00:00:00 +0000 in RFC 822, 1036, 1123, 2822
Thursday, 23-May-19 00:00:00 UTC in RFC 2822
2019-05-23T00:00:00+00:00 in RFC 3339
```

*Closing Time*: 30th June 2020, 23:59:59
```
Unix-Timestamp: 1593561599
2020-06-30T23:59:59+00:00 in ISO 8601
Tue, 30 Jun 2020 23:59:59 +0000 in RFC 822, 1036, 1123, 2822
Tuesday, 30-Jun-20 23:59:59 UTC in RFC 2822
2020-06-30T23:59:59+00:00 in RFC 3339
```

Result:

```
? Pick a contract to instantiate NCDTokenSale
All contracts are up to date
? Do you want to call a function on the instance after creating it? Yes
? Select which function initialize(owner: address, openingTime: uint256, closingTime: uint256, token: address)
? owner (address): 0x2353e45fF9613cFB05CC797E15cC37fd0d7F9658
? openingTime (uint256): 1558569600
? closingTime (uint256): 1593561599
? token (address): 0x5cB51E5f6a6a6807531a856BDd7972ce44eFC702
✓ Instance created at 0x3fe10248A73b9E0a2585dB979CF081543B70d793
0x3fe10248A73b9E0a2585dB979CF081543B70d793
```

### Adding NCDTokenSale Contract as minter onto NCDToken:


```
$ zos send-tx --from=0x2353e45fF9613cFB05CC797E15cC37fd0d7F9658
? Pick a network ropsten
? Pick an instance NCDToken at 0x5cB51E5f6a6a6807531a856BDd7972ce44eFC702
? Select which function addMinter(account: address)
? account (address): 0xE0E37E610bD2b3C8ba83c80361E1110B219B1AD0
✓ Transaction successful. Transaction hash: 0x2e484d1416994df2c031cdeb6d46ccc600918fdb604bf862f022fcbb08bee763
Events emitted:
 - MinterAdded(0xE0E37E610bD2b3C8ba83c80361E1110B219B1AD0)
```

## Team Token Vesting Contracts

Vesting Periods:

https://docs.google.com/spreadsheets/d/1EVD1aWruZ2IWfTZqiRajrF0tTM00IY_doual6ZuUu5A/edit#gid=654740006


### Deploying TokenVesting for first month


Beneficiary (address): "0x2353e45fF9613cFB05CC797E15cC37fd0d7F9658"
Start: 1558569600 (05/23/2019 @ 12:00am UTC)
End: 1561291199 (06/23/2019 @ 11:59am (UTC))
CliffDuration: 31536000
PeriodLength: 2721599

```
♠ zos create --network ropsten --skip-compile --verbose --verbose
? Pick a contract to instantiate TokenVesting
[2019-08-08T07:04:00.126Z@NetworkController.js#push] <started> All contracts are up to date
? Do you want to call a function on the instance after creating it? Yes
? Select which function * initialize(beneficiary: address, start: uint256, cliffDuration: uint256, periodLength: uint256, periodRate: uint256, owner: address)
? beneficiary (address): 0x2353e45fF9613cFB05CC797E15cC37fd0d7F9658
? start (uint256): 1558569600
? cliffDuration (uint256): 31536000
? periodLength (uint256): 2721599
? periodRate (uint256): 10
? owner (address): 0x2353e45fF9613cFB05CC797E15cC37fd0d7F9658
[2019-08-08T07:13:52.168Z@BaseSimpleProject.js#_getAndLogInitCallData] <started> Creating instance for contract at 0x0C19D6baEF6Eb7C1889Dc12F26896B61b56dbfFf and calling 'initialize' with:
- beneficiary (address): "0x2353e45fF9613cFB05CC797E15cC37fd0d7F9658"
- start (uint256): "1558569600"
- cliffDuration (uint256): "31536000"
- periodLength (uint256): "2721599"
- periodRate (uint256): "10"
- owner (address): "0x2353e45fF9613cFB05CC797E15cC37fd0d7F9658"
[2019-08-08T07:14:13.238Z@BaseSimpleProject.js#_getAndLogInitCallData] <succeeded> Instance created at 0x4685e6402a6BD5b98B0E61A553dc24F5458d4C4c
0x4685e6402a6BD5b98B0E61A553dc24F5458d4C4c
[2019-08-08T07:14:14.124Z@ZosNetworkFile.js#write] <started> Updated zos.ropsten.json
```

Instance: 0x4685e6402a6BD5b98B0E61A553dc24F5458d4C4c

# Added Vesting Lock

♠ zos send-tx --network ropsten
? Pick an instance NCDTokenSale at 0x3fe10248A73b9E0a2585dB979CF081543B70d793
? Select which function addVestingLock(vestingPeriodStart: uint256, vesting: address)
? vestingPeriodStart (uint256): 1558569600
? vesting (address): 0x4685e6402a6BD5b98B0E61A553dc24F5458d4C4c
✓ Transaction successful. Transaction hash: 0x8a82f57eefe83bd0b9d1c0d46705903f22166aa07f08cb1e4bb78e0d1476bbb5
Events emitted:
 - VestingLockAdded(1558569600, 1590105600, 0x4685e6402a6BD5b98B0E61A553dc24F5458d4C4c, 2721599, 10)

### Deploying TokenVesting for second month

- beneficiary (address): "0x2353e45fF9613cFB05CC797E15cC37fd0d7F9658"
Start: 1561248000 (06/23/2019 @ 12:00am UTC)
End: 1563926399 (07/23/2019 @ 11:59am (UTC))
CliffDuration: 2678399

 Do you want to call a function on the instance after creating it? Yes
? Select which function * initialize(beneficiary: address, start: uint256, cliffDuration: uint256, periodLength: uint256, periodRate: uint256, owner: address)
? beneficiary (address): 0x2353e45fF9613cFB05CC797E15cC37fd0d7F9658
? start (uint256): 1561248000
? cliffDuration (uint256): 31536000
? periodLength (uint256): 2721599
? periodRate (uint256): 10
? owner (address): 0x2353e45fF9613cFB05CC797E15cC37fd0d7F9658
[2019-08-16T11:27:30.412Z@BaseSimpleProject.js#_getAndLogInitCallData] <started> Creating instance for contract at 0x0C19D6baEF6Eb7C1889Dc12F26896B61b56dbfFf and calling 'initialize' with:
- beneficiary (address): "0x2353e45fF9613cFB05CC797E15cC37fd0d7F9658"
- start (uint256): "1561248000"
- cliffDuration (uint256): "31536000"
- periodLength (uint256): "2721599"
- periodRate (uint256): "10"
- owner (address): "0x2353e45fF9613cFB05CC797E15cC37fd0d7F9658"
[2019-08-16T11:27:48.295Z@BaseSimpleProject.js#_getAndLogInitCallData] <succeeded> Instance created at 0x49Ea11f6233b68368484C7476edaF19C18B3032f
0x49Ea11f6233b68368484C7476edaF19C18B3032f
[2019-08-16T11:27:49.012Z@ZosNetworkFile.js#write] <started> Updated zos.ropsten.json





## Test TOken Contract

0x69180509470B5b0493b58a70Ad2CB4388B2CdFd3

♠ zos create --network ropsten --skip-compile --verbose --verbose
? Pick a contract to instantiate TokenVesting
[2019-08-16T12:58:02.794Z@NetworkController.js#push] <started> All contracts are up to date
? Do you want to call a function on the instance after creating it? Yes
? Select which function * initialize(beneficiary: address, start: uint256, cliffDuration: uint256, periodLength: uint256, periodRate: uint256, owner: address)
? beneficiary (address): 0x2353e45fF9613cFB05CC797E15cC37fd0d7F9658
? start (uint256): 1565960314
? cliffDuration (uint256): 100
? periodLength (uint256): 30
? periodRate (uint256): 10
? owner (address): 0x2353e45fF9613cFB05CC797E15cC37fd0d7F9658
[2019-08-16T12:59:45.437Z@BaseSimpleProject.js#_getAndLogInitCallData] <started> Creating instance for contract at 0x0C19D6baEF6Eb7C1889Dc12F26896B61b56dbfFf and calling 'initialize' with:
- beneficiary (address): "0x2353e45fF9613cFB05CC797E15cC37fd0d7F9658"
- start (uint256): "1565960314"
- cliffDuration (uint256): "100"
- periodLength (uint256): "30"
- periodRate (uint256): "10"
- owner (address): "0x2353e45fF9613cFB05CC797E15cC37fd0d7F9658"
[2019-08-16T12:59:58.327Z@BaseSimpleProject.js#_getAndLogInitCallData] <succeeded> Instance created at 0x69180509470B5b0493b58a70Ad2CB4388B2CdFd3
0x69180509470B5b0493b58a70Ad2CB4388B2CdFd3
[2019-08-16T12:59:59.061Z@ZosNetworkFile.js#write] <started> Updated zos.ropsten.json


