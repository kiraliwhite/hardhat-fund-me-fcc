const {
  networkConfig,
  developmentChains,
} = require("../helper-hardhat-config");
//import helper-hardhat-config檔案中export出來的networkConfig物件

//import utils/verify.js中的verify function
const { verify } = require("../utils/verify");

const { network } = require("hardhat");
//import network從hardhat的library中,network用來查詢chainId,可以省略不import javascript自己會知道從哪裡來

//傳入兩個hre的變數給async匿名箭頭function 然後將async匿名function 打包給module.export
//getNamedAccounts跟deployments這兩個變數來自於hre(hardhat runtime environment)
module.exports = async ({ getNamedAccounts, deployments }) => {
  //從deployments變數中 提取兩個function 分別為deploy跟log
  const { deploy, log } = deployments;
  //從getNamedAccounts被命名好的帳戶這個變數中,提取一個帳戶名為deployer
  const { deployer } = await getNamedAccounts();
  //從network.config.chainId這個ethers(hardhat)的library中 提取chainID
  const chainId = network.config.chainId;

  //const ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"];
  //宣告一個變數 存放networkConfig中的智能合約地址  這是透過chainId 及物件關鍵字ethUsdPriceFeed
  //因此當部署到goerli時 chainId=5 就會抓到該goerli上的餵價智能合約地址 存到變數中
  let ethUsdPriceFeedAddress;
  //若部署的區塊鏈為localhost或是hardhat network
  if (developmentChains.includes(network.name)) {
    //透過deployment的get 部署最新的MockV3Aggreator這是按名稱獲取部署
    const ethUsdAggregator = await deployments.get("MockV3Aggregator");
    ethUsdPriceFeedAddress = ethUsdAggregator.address;
  } else {
    //如果部署的區塊鏈不是localhost或是hardhat 則套用helper-hardhat-config中的變數,依照chainId選擇
    ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"];
  }

  //將ethUsdPriceFeedAddress這個餵價合約的地址設定為外部變數,
  //因為在verify時會用到
  const args = [ethUsdPriceFeedAddress];
  //宣告一個變數存放部署出來的合約
  //部署合約的檔案是FundMe.sol
  const fundMe = await deploy("FundMe", {
    //在部署時使用deployer這個帳號
    from: deployer,
    //在部署合約時傳遞變數address 給constructor
    args: args,
    //紀錄log
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
    //從hardhat.config.js中抓取宣告好等待的區塊確認,如果該值沒有宣告,則只等待一個區塊確認
  });

  if (
    //當開發環境的網路,不是localhost,hardhat network時,且ETHERSCAN_API_KEY存在時
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    //呼叫驗證智能合約的function
    await verify(fundMe.address, args);
  }

  log("----------------------------------------");
};

module.exports.tags = ["all", "fundme"];
