const path = require("path");
require('dotenv').config();

const HDWalletProvider = require("truffle-hdwallet-provider");
const infuraProjectId = process.env.INFURA_API_KEY;

const x = new HDWalletProvider(
  process.env.DEV_MNEMONIC, "https://ropsten.infura.io/v3/" + infuraProjectId, 0, 1,
  true, "m/44'/1'/0'/0/"
  )

console.log(x.getAddresses())


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
      gas: 8000000,
      gasPrice: 10000000000,
    },
    kovan: {
      provider: function() {
        return new HDWalletProvider(mnemonic, 'https://kovan.infura.io/v3/' + INFURA_ID)
      },
      network_id: '42',
      gas: 4465030,
      gasPrice: 10000000000,
    },
    rinkeby: {
      provider: () => new HDWalletProvider(mnemonic, "https://rinkeby.infura.io/v3/" + INFURA_ID),
      network_id: 4,
      gas: 3000000,
      gasPrice: 10000000000
    },
    // main ethereum network(mainnet)
    main: {
      provider: () => new HDWalletProvider(mnemonic, "https://mainnet.infura.io/v3/" + INFURA_ID),
      network_id: 1,
      gas: 3000000,
      gasPrice: 10000000000
    }
  },
  mocha: {
/*    reporter: 'eth-gas-reporter',
    reporterOptions : {
      currency: 'EUR',
      gasPrice: 21
    }*/
  },
  solc: {
    optimizer: {
        enabled: true,
        runs: 200,
    }
  }
};
