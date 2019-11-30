# BBM443 Project - Taxi Partnership Contract
### Hasan Akalp, 21783575

## Initialize Contract
When deploying contract, you should fill the needed paramaters in order: participation fee, dividend share time interval, car maintenance time interval, car maintance cost. 

## Assumptions
* Did not check balances, because there is pre-implemented control in Ethereum for balance checking.
* Did not put control in getCharge function, because if there is no driver no one can call it.
* When start contract, first driver have to get enough vote from participants, manager cannot set directly.
* offerValidTime variable should be a real date like 01.01.2019, not range like 2 weeks. Have to convert them to linux timestamp to use in contract.
* When proposing anything, contract does not check is there an old proposal.

## Test
