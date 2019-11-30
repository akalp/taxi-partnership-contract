# BBM443 Project - Taxi Partnership Contract
### Hasan Akalp, 21783575

## Assumptions
* Did not check balances, because there is pre-implemented control in Ethereum for balance checking.
* Did not put control in getCharge function, because if there is no driver no one can call it.
* When start contract, first driver have to get enough vote from participants, manager cannot set directly.
* offerValidTime variable should be a real date like 01.01.2019, not range like 2 weeks. Have to convert them to linux timestamp to use in contract.

## Test
