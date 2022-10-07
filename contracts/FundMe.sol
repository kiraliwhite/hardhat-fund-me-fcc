// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./PriceConverter.sol";

error failed();

contract FundMe {
    using PriceConverter for uint256;
    address public immutable i_owner;
    //宣告一個全域變數,priceFeed,其類別是AggregatorV3Interface
    AggregatorV3Interface public priceFeed;

    //傳遞一個address變數給constructor
    constructor(address priceFeedAddress) {
        i_owner = msg.sender;
        //將全域變數設定為interface(智能合約地址)
        priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    modifier onlyOwner() {
        require(msg.sender == i_owner);
        _;
    }

    uint public constant MINIUSD = 10 * 1e18;
    address[] public funders;
    mapping(address => uint) public fundMoney;

    function fund() public payable {
        //在msg.value呼叫library的function getConversionRate時,額外再傳遞一個全域變數priceFeed
        require(msg.value.getConversionRate(priceFeed) > MINIUSD);
        funders.push(msg.sender);
        fundMoney[msg.sender] += msg.value;
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
        if (call != true) {
            revert failed();
        }
    }

    receive() external payable {
        fund();
    }

    fallback() external payable {
        fund();
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
            revert failed();
        }
    }

    function callFromContract(address payable _to, uint _value)
        public
        onlyOwner
    {
        (bool call, ) = _to.call{value: _value}("");
        if (call != true) {
            revert failed();
        }
    }
}
