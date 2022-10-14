const { getNamedAccounts, ethers, deployments, network } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");
const { assert } = require("chai");

// let aaa = true  宣告變數aaa為true
// let someVar = aaa ? "yes" : "no"  如果aaa是true則someVar就會等於yes,不然則為no
// 上述等同於下面的if判斷式
// if (aaa) { someVar = "yes" } else { someVar = "no"}

//同理 應用在下方  如果developmentChains是在本地網路執行
developmentChains.includes(network.name)
  ? describe.skip //則忽略整個describe
  : describe("FundMe", async () => {
      //如果不在本地網路執行,而是在測試網,則執行describe
      let fundMe;
      let deployer;
      const sendValue = ethers.utils.parseEther("1");
      beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer;
        fundMe = await ethers.getContract("FundMe", deployer);
      });

      //撰寫一個簡單的測試,
      it("allows people to fund and withdraw", async () => {
        //存款
        await fundMe.fund({ value: sendValue });
        //提款
        await fundMe.withdraw();
        //獲得合約的金額
        const endingFundMeBalance = await fundMe.provider.getBalance(
          fundMe.address
        );
        //檢查合約金額是否為0
        assert.equal(endingFundMeBalance.toString(), "0");
      });
    });
