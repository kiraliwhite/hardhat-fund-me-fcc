// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

library PriceConverter {
    //在function多加一個傳入參數AggregatorV3Interface priceFeed
    function getPrice(AggregatorV3Interface priceFeed)
        internal
        view
        returns (uint)
    {
        //註解原有寫死的智能合約地址
        // AggregatorV3Interface priceFeed = AggregatorV3Interface(
        //     0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e
        // );
        //透過AggregatorV3Interface priceFeed直接取用其ABI latestRoundData 得到ethPrice的餵價
        (, int256 ethPrice, , , ) = priceFeed.latestRoundData();
        return uint(ethPrice * 1e10);
    }

    //在這個function多加上第二個輸入變數AggregatorV3Interface priceFeed,用來承接fundme.sol合約傳送過來的priceFeed全域變數
    function getConversionRate(uint _ethAmount, AggregatorV3Interface priceFeed)
        internal
        view
        returns (uint)
    {
        //呼叫getPrice function時傳遞priceFeed變數進去
        uint ethPrice = getPrice(priceFeed);
        uint totalUSD = (ethPrice * _ethAmount) / 1e18;
        return totalUSD;
    }
}
