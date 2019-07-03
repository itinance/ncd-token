# Deployment on Mainnet

## Protocoll

### 2019-07-02 14:00:00 Deploy contracts

Initially:

```
Owner: 0x078dC1BAc6570cA60b00bb4Ba2a37aE3C3F25CC6
Minter: 0x078dC1BAc6570cA60b00bb4Ba2a37aE3C3F25CC6
Pauser: 0x078dC1BAc6570cA60b00bb4Ba2a37aE3C3F25CC6
```

### Opening Time: 1558569600
```
05/23/2019 @ 12:00am (UTC)
2019-05-23T00:00:00+00:00 in ISO 8601
Thu, 23 May 2019 00:00:00 +0000 in RFC 822, 1036, 1123, 2822
Thursday, 23-May-19 00:00:00 UTC in RFC 2822
2019-05-23T00:00:00+00:00 in RFC 3339
```

### Closing time: 1593561599

```
06/30/2020 @ 11:59pm (UTC)
2020-06-30T23:59:59+00:00 in ISO 8601
Tue, 30 Jun 2020 23:59:59 +0000 in RFC 822, 1036, 1123, 2822
Tuesday, 30-Jun-20 23:59:59 UTC in RFC 2822
2020-06-30T23:59:59+00:00 in RFC 3339
```

# 1. Push contracts

zos push --network main --skip-compile

```
Using session with network main, sender address 0x078dC1BAc6570cA60b00bb4Ba2a37aE3C3F25CC6, timeout 1000000 seconds
✓ Linked dependency openzeppelin-eth 2.1.3
✓ Contract NCDToken deployed
✓ Contract NCDTokenSale deployed
✓ Contract TokenVesting deployed
All contracts have been deployed
```

# 2. Verification

## 2.1. NCDToken

```
$ zos verify --remote etherscan --network main --api-key xxxx
? Pick a contract NCDToken
? Was the optimizer enabled when you compiled your contracts? Yes
? Specify the optimizer runs 200
Using session with network main, sender address 0x078dC1BAc6570cA60b00bb4Ba2a37aE3C3F25CC6, timeout 1000000 seconds
✓ Contract source code of NCDToken verified and published successfully. You can check it here: https://etherscan.io/address/0xc6e32E585dBFF0C023CBF9Fa3fe3014Ad7d230d2#code
```

## 2.2. NCDTokenSale

```
$ zos verify --remote etherscan --network main --api-key xxxx
? Pick a contract NCDTokenSale
? Was the optimizer enabled when you compiled your contracts? Yes
? Specify the optimizer runs 200
Using session with network main, sender address 0x078dC1BAc6570cA60b00bb4Ba2a37aE3C3F25CC6, timeout 1000000 seconds
✓ Contract source code of NCDTokenSale verified and published successfully. You can check it here: https://etherscan.io/address/0x6C861114DdbC30Fb266F8DaC5b386528A8E3Cf90#code
```

## 2.3. TokenVesting

```
$ zos verify --remote etherscan --network main --api-key ZW5EVBSB7EJMNGTD4NHARNDUPTE54CRA1M
? Pick a contract TokenVesting
? Was the optimizer enabled when you compiled your contracts? Yes
? Specify the optimizer runs 200
Using session with network main, sender address 0x078dC1BAc6570cA60b00bb4Ba2a37aE3C3F25CC6, timeout 1000000 seconds
✓ Contract source code of TokenVesting verified and published successfully. You can check it here: https://etherscan.io/address/0xC358183D03C4130522497F28a45B425cC08226e1#code
```

# 3. Creation

# 3.1. Create NCDToken Instance

```
$ zos create --network main --timeout 1000000 --skip-compile --verbose --verbose
? Pick a contract to instantiate NCDToken
[2019-07-02T17:43:01.625Z@Session.js#getOptions] <started> Using session with network main, sender address 0x078dC1BAc6570cA60b00bb4Ba2a37aE3C3F25CC6
[2019-07-02T17:43:06.315Z@NetworkController.js#push] <started> All contracts are up to date
? Do you want to call a function on the instance after creating it? Yes
? Select which function * initialize(owner: address, pausers: address[])
? owner (address): 0x078dC1BAc6570cA60b00bb4Ba2a37aE3C3F25CC6
? pausers (address[]): 0x078dC1BAc6570cA60b00bb4Ba2a37aE3C3F25CC6
[2019-07-02T17:43:24.170Z@ProxyAdmin.js#deploy] <started> Setting everything up to create contract instances
[2019-07-02T17:43:59.833Z@ProxyAdmin.js#deploy] <succeeded> Setting everything up to create contract instances
[2019-07-02T17:43:59.841Z@BaseSimpleProject.js#_getAndLogInitCallData] <started> Creating instance for contract at 0xc6e32E585dBFF0C023CBF9Fa3fe3014Ad7d230d2 and calling 'initialize' with:
- owner (address): "0x078dC1BAc6570cA60b00bb4Ba2a37aE3C3F25CC6"
- pausers (address[]): ["0x078dC1BAc6570cA60b00bb4Ba2a37aE3C3F25CC6"]
[2019-07-02T17:45:30.890Z@BaseSimpleProject.js#_getAndLogInitCallData] <succeeded> Instance created at 0xE0C8b298db4cfFE05d1bEA0bb1BA414522B33C1B
0xE0C8b298db4cfFE05d1bEA0bb1BA414522B33C1B
[2019-07-02T17:45:31.638Z@ZosNetworkFile.js#write] <started> Updated zos.mainnet.json
```

Instance of Token: 0x9D38d8bC4993fF4E8574b807290e8eF0676E1B98

# 3.2. Create NCDTokenSale Instance

```
$ zos create --network main --timeout 1000000 --skip-compile --verbose --verbose
? Pick a contract to instantiate NCDTokenSale
[2019-07-02T17:46:36.815Z@Session.js#getOptions] <started> Using session with network main, sender address 0x078dC1BAc6570cA60b00bb4Ba2a37aE3C3F25CC6
[2019-07-02T17:46:42.002Z@NetworkController.js#push] <started> All contracts are up to date
? Do you want to call a function on the instance after creating it? Yes
? Select which function initialize(owner: address, openingTime: uint256, closingTime: uint256, token: address)
? owner (address): 0x078dC1BAc6570cA60b00bb4Ba2a37aE3C3F25CC6
? openingTime (uint256): 1558569600
? closingTime (uint256): 1593561599
? token (address): 0xE0C8b298db4cfFE05d1bEA0bb1BA414522B33C1B
[2019-07-02T17:47:17.903Z@BaseSimpleProject.js#_getAndLogInitCallData] <started> Creating instance for contract at 0x6C861114DdbC30Fb266F8DaC5b386528A8E3Cf90 and calling 'initialize' with:
- owner (address): "0x078dC1BAc6570cA60b00bb4Ba2a37aE3C3F25CC6"
- openingTime (uint256): "1558569600"
- closingTime (uint256): "1593561599"
- token (address): "0xE0C8b298db4cfFE05d1bEA0bb1BA414522B33C1B"
[2019-07-02T17:50:13.343Z@BaseSimpleProject.js#_getAndLogInitCallData] <succeeded> Instance created at 0x09c736B404889b48e5BC174232F91FF45886809e
0x09c736B404889b48e5BC174232F91FF45886809e
[2019-07-02T17:50:14.064Z@ZosNetworkFile.js#write] <started> Updated zos.mainnet.json
```

# 3.3. Make NCDTokenSale a minter on NCDToken

```
$ zos send-tx
Using session with network main, sender address 0x078dC1BAc6570cA60b00bb4Ba2a37aE3C3F25CC6, timeout 123123 seconds
? Pick an instance NCDToken at 0xE0C8b298db4cfFE05d1bEA0bb1BA414522B33C1B
? Select which function addMinter(account: address)
? account (address): 0x09c736B404889b48e5BC174232F91FF45886809e
✓ Transaction successful. Transaction hash: 0x1972153cf2f77ac4e2aa16d3b131179c0482e5cabf97c32ec31e51e77fce9f6f
Events emitted:
 - MinterAdded(0x09c736B404889b48e5BC174232F91FF45886809e)
```

```
$ zos send-tx
Using session with network main, sender address 0x078dC1BAc6570cA60b00bb4Ba2a37aE3C3F25CC6, timeout 1000000 seconds
? Pick an instance NCDTokenSale at 0x8564Ca67d54A2f78a54271D88FB934A2F29f7592
? Select which function mintTokens(beneficiary: address, tokenAmount: uint256)
? beneficiary (address): 0xd6c34eE1f618AB9325B54Bd549Cbb37bCcc44512
? tokenAmount (uint256): 1000
✓ Transaction successful. Transaction hash: 0x741fa00e87ca746b42b233ec3145e26593f5cdcd46280c1e4599159384f2f9dd
```

# 3.4. Remove initiale minter from Token, let NCDTokenSale be as the only minter left

```
$ zos send-tx
Using session with network main, sender address 0x078dC1BAc6570cA60b00bb4Ba2a37aE3C3F25CC6, timeout 123123 seconds
? Pick an instance NCDToken at 0xE0C8b298db4cfFE05d1bEA0bb1BA414522B33C1B
? Select which function renounceMinter()
✓ Transaction successful. Transaction hash: 0x95527f74106cde4b70e0ff173aa91108a162bb8b316effd469d1ef49abe7f1a5
Events emitted:
 - MinterRemoved(0x078dC1BAc6570cA60b00bb4Ba2a37aE3C3F25CC6)
 ```

# 3.5. Add second minter role to NCDTokenSale
```
$ zos send-tx
 Using session with network main, sender address 0x078dC1BAc6570cA60b00bb4Ba2a37aE3C3F25CC6, timeout 123123 seconds
? Pick an instance NCDTokenSale at 0x09c736B404889b48e5BC174232F91FF45886809e
? Select which function addMinter(account: address)
? account (address): 0x55558ad492526C7338A4e3f0A057B70A07209954
✓ Transaction successful. Transaction hash: 0x6f00b231b079bf9e1dca533020fb3e4f8e51f9d85bc367fefba952d1126a0b83
Events emitted:
 - MinterAdded(0x55558ad492526C7338A4e3f0A057B70A07209954)
 ```


