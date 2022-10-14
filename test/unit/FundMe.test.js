const { ethers, deployments, getNamedAccounts, network } = require("hardhat");
const { assert, expect } = require("chai");
const { developmentChains } = require("../../helper-hardhat-config");

//如果不在本地網路執行 就skip describe 所有的code
!developmentChains.includes(network.name)
  ? describe.skip
  : describe("FundMe", async () => {
      let fundMe; //設定為外層全域變數,使其在底下的test也能夠讀取,是一個變數,主要的用途為存放抓取部署好的智能合約
      let deployer; //存放帳號
      let mockV3Aggregator;
      //const sendValue = "1000000000000000000" // 1ETH
      const sendValue = ethers.utils.parseEther("1"); //宣告變數1ETH 等同於上面那行

      //在進行it測試前,需要做的事情放在beforeEach內
      beforeEach(async () => {
        //抓取帳號deployer從getNamedAccounts而來
        //我們將把它包裝起來，這樣我們就可以抓住這個deployer object並將其分配給聲明declare
        //deployer這個帳號 等於 從getNamedAccounts裡面的deployer 而來,而這個section的預設帳號為0
        //就會依照該網路的不同而抓取不同的default帳號 詳情看hardhat.config.js
        deployer = (await getNamedAccounts()).deployer;
        //console.log(`deployer is ${deployer}`);
        //使用deployments的fixture會掃描在deploy資料夾底下,所有tags是all的script都會執行
        await deployments.fixture("all");
        //部署出來的合約使用ethers.getContract去抓取,關鍵字是FundMe這個合約,帳號是deployer
        fundMe = await ethers.getContract("FundMe", deployer);
        //抓取部署出來的mock合約MockV3Aggregator,塞在變數內,
        //使用deployer帳號跟合約連接(因為如果是其他帳號碰到onlyOwenr等modifier就無法與合約互動)
        mockV3Aggregator = await ethers.getContract(
          "MockV3Aggregator",
          deployer
        );
      });

      //撰寫針對此fundMe合約的constructor的測試,不使用箭頭函式改成一般的function也可以
      describe("constructor", async function () {
        it("sets the aggregator addresses correctly", async () => {
          //當合約部署完成後的priceFeed 就是等於該網路的餵價合約的地址
          const response = await fundMe.getPricefeed();
          //使用assert比對部署出來合約的priceFeed,是否等於mockV3Aggregator的地址
          assert.equal(response, mockV3Aggregator.address);
        });
      });

      describe("fund", async () => {
        it("Fails if you don't send enough ETH", async function () {
          //這行expect會去抓fundMe合約中的fund function的require revert關鍵字"You need to spend more ETH""
          await expect(fundMe.fund()).to.be.reverted;
        });
        //撰寫fund function的mapping測試,檢查送到function內的錢,是否等於我們宣告的錢
        it("updated the amount funded data structure", async function () {
          //傳送1ETH到fundMe合約中的fund function
          await fundMe.fund({ value: sendValue });
          //呼叫fundMe合約中的mapping,使用的是deployer的地址
          const response = await fundMe.getFunderMoney(deployer);
          //檢查mapping中的價值,是否等於我們送進fund function的價值,會需要toString是因為這兩個都是bigNumber
          assert.equal(response.toString(), sendValue.toString());
        });
        //撰寫fund function的array測試,檢查捐款人的陣列是否正確
        it("Adds funder to array of funders", async function () {
          //對fund function發送ETH
          await fundMe.fund({ value: sendValue });
          //提取fundMe 合約中的funders陣列index0,因為上述是捐款,所以此時記錄了捐款人的地址
          const funder = await fundMe.getFunder(0);
          //檢查陣列中index0捐款人地址是否等於deployer地址
          assert.equal(funder, deployer);
        });
      });
      describe("withdraw", async () => {
        beforeEach(async function () {
          await fundMe.fund({ value: sendValue });
        });
        it("Withdraw ETH from a single founder", async () => {
          //Arrange
          //取得合約中的初始餘額存在變數中
          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          //取得創建合約者deployer的初始餘額,存在變數中
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );
          //Act
          //呼叫合約的withdraw function並等待一個區塊確認
          const transactionResponse = await fundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait(1);

          //從transactionReceipt物件中提取兩個物件gasUsed和effectiveGasPrice
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          //取得gas花費,等於gasUsed乘以effectiveGasPrice,但因為兩者都是bigNumber,所以使用mul
          const gasCost = gasUsed.mul(effectiveGasPrice);

          //取得呼叫withdraw function後的合約餘額
          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          //取得呼叫withdraw function後的deployer帳戶餘額
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );
          //assert
          //比較,呼叫withdraw function後的合約餘額 是否為0
          assert.equal(endingFundMeBalance, 0);
          //比較,呼叫withdraw function後的deployer帳戶餘額加上gasCost,是否等於初始合約餘額+初始deployer帳戶餘額
          //因為是把所有的錢,從合約中提領出來,存到deployer帳戶內,且要扣掉呼叫withdraw function的Gas Fee
          assert.equal(
            startingFundMeBalance.add(startingDeployerBalance).toString(),
            endingDeployerBalance.add(gasCost).toString()
          );
        });

        //撰寫withdraw有多個捐款人的測試
        it("allows us to withdraw with mulitple funders", async () => {
          //arrange
          //使用ethers的library抓回所有的Signer,存到變數中,這個accounts 是一個物件陣列
          //因為在本地端執行測試,所以這個accounts會有20個fake account存在物件陣列中
          const accounts = await ethers.getSigners();
          //console.log(accounts);
          //可以列出物件陣列中的accounts[0],也就是deployer的資訊
          //console.log(accounts[0]);
          //寫一個for迴圈 用來遍歷整個物件陣列accounts,因為0是deployer,所以從1開始
          for (let i = 1; i < 6; i++) {
            //使用for迴圈的index,抓取物件陣列accounts的物件,然後將contract與該物件connect
            const fundMeConnectedContract = await fundMe.connect(accounts[i]);
            //呼叫合約中的fund function,此時與合約連接的不是deployer帳戶,而是accounts陣列中照順序的其他帳戶
            //發送金額給fund function
            await fundMeConnectedContract.fund({ value: sendValue });
          }
          //取得創建合約中的初始餘額,存在變數中
          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          //取得創建合約者deployer的初始餘額,存在變數中
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );
          //Act
          //呼叫合約的withdraw function並等待一個區塊確認
          const transactionResponse = await fundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait(1);

          //從transactionReceipt物件中提取兩個物件gasUsed和effectiveGasPrice
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          //取得gas花費,等於gasUsed乘以effectiveGasPrice,但因為兩者都是bigNumber,所以使用mul
          const gasCost = gasUsed.mul(effectiveGasPrice);

          //取得呼叫withdraw function後的合約餘額
          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          //取得呼叫withdraw function後的deployer帳戶餘額
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          //assert
          //比較,呼叫withdraw function後的合約餘額 是否為0
          assert.equal(endingFundMeBalance, 0);
          //比較,呼叫withdraw function後的deployer帳戶餘額加上gasCost,是否等於初始合約餘額+初始deployer帳戶餘額
          //因為是把所有的錢,從合約中提領出來,存到deployer帳戶內,且要扣掉呼叫withdraw function的Gas Fee
          assert.equal(
            startingFundMeBalance.add(startingDeployerBalance).toString(),
            endingDeployerBalance.add(gasCost).toString()
          );

          //因為當合約owner呼叫withdraw function之後,我們有寫清除funders捐款人名單,所以預期此行會出錯
          //因為捐款人陣列已被清空
          await expect(fundMe.getFunder(0)).to.be.reverted;

          //使用for迴圈當index,取得捐款地址與金額的mapping,所有捐款地址的金額,都是0
          for (let i = 1; i < 6; i++) {
            assert.equal(await fundMe.getFunderMoney(accounts[i].address), 0);
          }
        });

        //測試只有deployer帳號能夠呼叫withdraw function
        it("Only allows the owner to withdraw", async function () {
          //從ethers 取得accounts物件陣列
          const accounts = await ethers.getSigners();
          //宣告一個變數attacker,將物件陣列中的index1的帳號物件塞進去
          //const attacker = accounts[1];
          //使用index1的帳號連線到contract
          const attackerConnectedContract = await fundMe.connect(accounts[1]);
          //預期該帳號無法呼叫withdraw function且會報錯
          await expect(attackerConnectedContract.withdraw()).to.be.reverted;
        });

        it("cheaperwithdraw ETH from a single founder", async () => {
          //Arrange
          //取得合約中的初始餘額存在變數中
          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          //取得創建合約者deployer的初始餘額,存在變數中
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );
          //Act
          //呼叫合約的withdraw function並等待一個區塊確認
          const transactionResponse = await fundMe.cheaperwithdraw();
          const transactionReceipt = await transactionResponse.wait(1);

          //從transactionReceipt物件中提取兩個物件gasUsed和effectiveGasPrice
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          //取得gas花費,等於gasUsed乘以effectiveGasPrice,但因為兩者都是bigNumber,所以使用mul
          const gasCost = gasUsed.mul(effectiveGasPrice);

          //取得呼叫withdraw function後的合約餘額
          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          //取得呼叫withdraw function後的deployer帳戶餘額
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );
          //assert
          //比較,呼叫withdraw function後的合約餘額 是否為0
          assert.equal(endingFundMeBalance, 0);
          //比較,呼叫withdraw function後的deployer帳戶餘額加上gasCost,是否等於初始合約餘額+初始deployer帳戶餘額
          //因為是把所有的錢,從合約中提領出來,存到deployer帳戶內,且要扣掉呼叫withdraw function的Gas Fee
          assert.equal(
            startingFundMeBalance.add(startingDeployerBalance).toString(),
            endingDeployerBalance.add(gasCost).toString()
          );
        });

        //撰寫withdraw有多個捐款人的測試
        it("allows us to cheaperwithdraw with mulitple funders", async () => {
          //arrange
          //使用ethers的library抓回所有的Signer,存到變數中,這個accounts 是一個物件陣列
          //因為在本地端執行測試,所以這個accounts會有20個fake account存在物件陣列中
          const accounts = await ethers.getSigners();
          //console.log(accounts);
          //可以列出物件陣列中的accounts[0],也就是deployer的資訊
          //console.log(accounts[0]);
          //寫一個for迴圈 用來遍歷整個物件陣列accounts,因為0是deployer,所以從1開始
          for (let i = 1; i < 6; i++) {
            //使用for迴圈的index,抓取物件陣列accounts的物件,然後將contract與該物件connect
            const fundMeConnectedContract = await fundMe.connect(accounts[i]);
            //呼叫合約中的fund function,此時與合約連接的不是deployer帳戶,而是accounts陣列中照順序的其他帳戶
            //發送金額給fund function
            await fundMeConnectedContract.fund({ value: sendValue });
          }
          //取得創建合約中的初始餘額,存在變數中
          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          //取得創建合約者deployer的初始餘額,存在變數中
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );
          //Act
          //呼叫合約的withdraw function並等待一個區塊確認
          const transactionResponse = await fundMe.cheaperwithdraw();
          const transactionReceipt = await transactionResponse.wait(1);

          //從transactionReceipt物件中提取兩個物件gasUsed和effectiveGasPrice
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          //取得gas花費,等於gasUsed乘以effectiveGasPrice,但因為兩者都是bigNumber,所以使用mul
          const gasCost = gasUsed.mul(effectiveGasPrice);

          //取得呼叫withdraw function後的合約餘額
          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          //取得呼叫withdraw function後的deployer帳戶餘額
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          //assert
          //比較,呼叫withdraw function後的合約餘額 是否為0
          assert.equal(endingFundMeBalance, 0);
          //比較,呼叫withdraw function後的deployer帳戶餘額加上gasCost,是否等於初始合約餘額+初始deployer帳戶餘額
          //因為是把所有的錢,從合約中提領出來,存到deployer帳戶內,且要扣掉呼叫withdraw function的Gas Fee
          assert.equal(
            startingFundMeBalance.add(startingDeployerBalance).toString(),
            endingDeployerBalance.add(gasCost).toString()
          );

          //因為當合約owner呼叫withdraw function之後,我們有寫清除funders捐款人名單,所以預期此行會出錯
          //因為捐款人陣列已被清空
          await expect(fundMe.getFunder(0)).to.be.reverted;

          //使用for迴圈當index,取得捐款地址與金額的mapping,所有捐款地址的金額,都是0
          for (let i = 1; i < 6; i++) {
            assert.equal(await fundMe.getFunderMoney(accounts[i].address), 0);
          }
        });

        //測試只有deployer帳號能夠呼叫withdraw function
        it("Only allows the owner to cheaperwithdraw", async function () {
          //從ethers 取得accounts物件陣列
          const accounts = await ethers.getSigners();
          //宣告一個變數attacker,將物件陣列中的index1的帳號物件塞進去
          //const attacker = accounts[1];
          //使用index1的帳號連線到contract
          const attackerConnectedContract = await fundMe.connect(accounts[1]);
          //預期該帳號無法呼叫withdraw function且會報錯
          await expect(attackerConnectedContract.cheaperwithdraw()).to.be
            .reverted;
        });
      });
    });
