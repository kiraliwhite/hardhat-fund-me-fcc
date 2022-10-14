// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PriceConverter.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "hardhat/console.sol";

error FundMe__failed();

contract FundMe {
    using PriceConverter for uint256;
    address private immutable i_owner;
    //宣告一個全域變數,priceFeed,其類別是AggregatorV3Interface
    AggregatorV3Interface private priceFeed;
    uint public constant MINIUSD = 10 * 1e18;
    address[] private funders;
    mapping(address => uint) private fundMoney;

    modifier onlyOwner() {
        if (msg.sender != i_owner) {
            revert FundMe__failed();
        }
        //require(msg.sender == i_owner);
        _;
    }

    //傳遞一個address變數給constructor
    constructor(address priceFeedAddress) {
        i_owner = msg.sender;
        //將全域變數設定為interface(智能合約地址)
        priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    receive() external payable {
        fund();
    }

    fallback() external payable {
        fund();
    }

    function fund() public payable {
        //在msg.value呼叫library的function getConversionRate時,額外再傳遞一個全域變數priceFeed
        // require(
        //     msg.value.getConversionRate(priceFeed) > MINIUSD,
        //     "You need to spend more ETH"
        // );
        if (msg.value.getConversionRate(priceFeed) < MINIUSD) {
            revert FundMe__failed();
        }
        funders.push(msg.sender);
        fundMoney[msg.sender] += msg.value;
        //透過import hardhat/console.sol 來使用console.log 在執行測試yarn hardhat test時,列出msg.sender跟msg.value
        //console.log("msgSender is %s, msgValue is %s", msg.sender, msg.value);
    }

    function withdraw() public onlyOwner {
        for (uint i = 0; i < funders.length; i++) {
            address tempAccount = funders[i];
            fundMoney[tempAccount] = 0;
        }
        funders = new address[](0);
        (bool call, ) = payable(msg.sender).call{value: address(this).balance}(
            ""
        );
        require(call);
        // if (call != true) {
        //     revert FundMe__failed();
        // }
    }

    function cheaperwithdraw() public onlyOwner {
        //將Storage中的捐款人名單陣列提取到一個暫存的陣列
        address[] memory tempFunders = funders;
        //使用for迴圈對該暫存陣列運算
        for (uint i = 0; i < tempFunders.length; i++) {
            //提取暫存陣列中的捐款人
            address tempFunder = tempFunders[i];
            //使用mapping將捐款人金額歸0
            fundMoney[tempFunder] = 0;
        }

        funders = new address[](0);
        //i_owner可以替換為msg.sender,意思是一樣的
        (bool call, ) = payable(i_owner).call{value: address(this).balance}("");
        require(call);
    }

    function traFromContract(address payable _to, uint _value)
        public
        onlyOwner
    {
        _to.transfer(_value);
    }

    function sendFromContract(address payable _to, uint _value)
        public
        onlyOwner
    {
        bool sent = _to.send(_value);
        if (sent != true) {
            revert FundMe__failed();
        }
    }

    function callFromContract(address payable _to, uint _value)
        public
        onlyOwner
    {
        (bool call, ) = _to.call{value: _value}("");
        if (call != true) {
            revert FundMe__failed();
        }
    }

    function getOwner() public view returns (address) {
        return i_owner;
    }

    function getFunder(uint _index) public view returns (address) {
        return funders[_index];
    }

    function getFunderMoney(address _funder) public view returns (uint) {
        return fundMoney[_funder];
    }

    function getPricefeed() public view returns (AggregatorV3Interface) {
        return priceFeed;
    }
}
