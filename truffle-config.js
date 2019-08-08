const path = require("path");
require('dotenv').config();

const HDWalletProvider = require("truffle-hdwallet-provider");
const infuraProjectId = process.env.INFURA_API_KEY;


//const a = new HDWalletProvider(process.env.MAIN_MNEMONIC, "https://mainnet.infura.io/v3/" + infuraProjectId);
//console.log(a.getAddresses());

/*const a = new HDWalletProvider(
  process.env.DEV_MNEMONIC, "https://ropsten.infura.io/v3/" + infuraProjectId, 0, 10,
  true, "m/44'/1'/0'/0/"
  )
console.log(a.getAddresses());*/



module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      gas: 6000000,
      gasPrice: 5e9,

      network_id: "*",
    },
    ropsten: {
      provider: () => new HDWalletProvider(
        process.env.DEV_MNEMONIC, "https://ropsten.infura.io/v3/" + infuraProjectId, 0, 10,
        true, "m/44'/1'/0'/0/"
        ),
      network_id: 3,       // Ropsten's id
      gas: 3000000,
      gasPrice: 10000000000,
    },
    kovan: {
      provider: function() {
        return new HDWalletProvider(mnemonic, 'https://kovan.infura.io/v3/' + infuraProjectId)
      },
      network_id: '42',
      gas: 4465030,
      gasPrice: 10000000000,
    },
    rinkeby: {
      provider: () => new HDWalletProvider(mnemonic, "https://rinkeby.infura.io/v3/" + infuraProjectId),
      network_id: 4,
      gas: 3000000,
      gasPrice: 10000000000
    },
    // main ethereum network(mainnet)
    main: {
      provider: () => new HDWalletProvider(process.env.MAIN_MNEMONIC, "https://mainnet.infura.io/v3/" + infuraProjectId),
      network_id: 1,
      gas: 3000000,
      gasPrice: 20000000000
    },
    coverage: {
      host: "localhost",
      network_id: "*",
      port: 8555,         // <-- If you change this, also set the port option in .solcover.js.
      gas: 0xfffffffffff, // <-- Use this high gas value
      gasPrice: 0x01      // <-- Use this low gas price
    },
  },
  _mocha: {
    reporter: (!process.env.SOLIDITY_COVERAGE) ? 'eth-gas-reporter' : 'spec',
    reporterOptions : {
      currency: 'EUR',
      gasPrice: 21
    }
  },
  compilers: {
    solc: {
      version: "0.5.7",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
      }
    }
  }
};
