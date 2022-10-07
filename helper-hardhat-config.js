const networkConfig = {
  5: {
    // chainId
    name: "goerli",
    // goerli 測試網上的eth/usd 餵價智能合約地址
    ethUsdPriceFeed: "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e",
  },
  137: {
    name: "polygon",
    ethUsdPriceFeed: "0xF9680D99D6C9589e2a93a78A04A279e509205945",
  },
};

//宣告一個變數 存放陣列 index0為 hardhat index1為localhost
const developmentChains = ["hardhat", "localhost"];

const DECIMALS = "8";
//定義小數點後8位
const INITIAL_ANSWER = "130000000000";
//定義以太幣對美元為1300元,然後小數點八位所以再加上8個0

module.exports = {
  // 將此物件export 讓外部的script也能夠使用
  networkConfig,
  //將此陣列變數export
  developmentChains,
  DECIMALS,
  INITIAL_ANSWER,
};
