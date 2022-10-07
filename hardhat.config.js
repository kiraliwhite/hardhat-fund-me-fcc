require("hardhat-deploy");
//const { task } = require("hardhat/config");
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("@nomiclabs/hardhat-etherscan");
//require("./tasks/block-number");
require("hardhat-gas-reporter");
require("solidity-coverage");
//require("@nomiclabs/hardhat-waffle");

const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
//const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    goerli: {
      url: GOERLI_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 5,
      blockConfirmations: 6, //等待六個區塊時間
    },
    hardhat: {
      //url: "http://127.0.0.1:8545/",
      //account: no need
      chainId: 31337,
    },
  },
  //solidity: "0.8.7",
  solidity: {
    compilers: [{ version: "0.8.8" }, { version: "0.6.6" }],
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  gasReporter: {
    enabled: false,
    //輸出成為一個檔案
    //outputFile: "gas-reporter.txt",
    //不需要顏色,因為txt檔顏色沒有意義
    noColors: true,
    //Gas花費用美元來顯示
    currency: "USD",
    //使用coinMarket Cap的API KEY 來取得以太坊兌美元的報價
    //coinmarketcap: COINMARKETCAP_API_KEY,
    gasPriceApi:
      "https://api.etherscan.io/api?module=proxy&action=eth_gasPrice",
  },
  namedAccounts: {
    deployer: {
      // default的欄位 這裡默認將第一個帳戶作為部署者
      default: 0,
      // chain ID = 1 也就是網路在以太坊主網時，它將第一個帳戶作為部署者。 請注意，根據 hardhat 網絡的配置方式，一個網絡上的帳戶 0 可能與另一個網絡上的不同
      1: 0,
    },
  },
};
