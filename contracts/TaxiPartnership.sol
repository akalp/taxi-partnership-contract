pragma solidity ^0.5.0;

contract TaxiPartnership {
    uint participationFee;

    mapping (address => uint) balances;

    address[] participantAccts;
    mapping (address => bool) participantCheck;

    address manager;
    address payable public carDealer;

    uint expenseTime; //Time required for expenses
    uint profitDistTime; //Time required for profit distribution
    uint expenseCost;

    struct CarProposal {
        bytes32 id;
        uint price;
        uint offerValidTime;
        mapping (address => bool) voted;
        uint8 positiveVoteCount;
    }
    bytes32 ownedCar;
    CarProposal carForSale; //Car which is selled by carDealer
    CarProposal carForRepurchase; //Car which is wanted to buy by carDealer

    struct Driver {
        address addr;
        uint salary;
        uint nextSalary; //When the next salary will be given to the driver.
    }
    Driver driver;

    uint nextExpense; //When the next expense will be paid.
    uint nextProfitDist; //When to distribute profits.

    constructor(uint _participationFee, uint _profitDistTime, uint _expenseTime, uint _expenseCost) public{
        manager = msg.sender;
        participationFee = _participationFee;
        profitDistTime = _profitDistTime;
        expenseTime = _expenseTime;
        expenseCost = _expenseCost;
    }

    function join() public payable canJoin{
        require(participantCheck[msg.sender] == false, "You are already a participant.");
        require(msg.value >= participationFee, "Participation fee is higher than the money you send.");
        participantAccts.push(msg.sender);
        participantCheck[msg.sender] = true;
    }

    function setCarDealer(address payable _carDealer) public onlyManager{
        carDealer = _carDealer;
    }

    function carProposeToBusiness(bytes32 carId, uint price, uint validTime) public onlyDealer {
        carForSale = CarProposal({
            id: carId,
            price: price,
            offerValidTime: validTime,
            positiveVoteCount: 0
        });
    }

    function approvePurchaseCar() public onlyParticipants validOffer(carForSale.offerValidTime){
        require(!carForSale.voted[msg.sender], "You already voted.");
        carForSale.voted[msg.sender] = true;
        carForSale.positiveVoteCount += 1;
    }

    function purchaseCar() public onlyManager greaterThenHalf(carForSale.positiveVoteCount) validOffer(carForSale.offerValidTime){
        ownedCar = carForSale.id;
        carDealer.transfer(carForSale.price);
        delete carForSale;
    }

    function repurchaseCarPropose(bytes32 carId, uint price, uint validTime) public onlyDealer{
        carForRepurchase = CarProposal({
            id: carId,
            price: price,
            offerValidTime: validTime,
            positiveVoteCount: 0
        });
    }

    function approveSellPropose() public onlyParticipants validOffer(carForRepurchase.offerValidTime){
        require(!carForRepurchase.voted[msg.sender], "You already voted.");
        carForRepurchase.voted[msg.sender] = true;
        carForRepurchase.positiveVoteCount += 1;
    }

    function repurchaseCar() public payable onlyDealer greaterThenHalf(carForRepurchase.positiveVoteCount)  validOffer(carForRepurchase.offerValidTime){
        require(msg.value == carForRepurchase.price, "You have to send enough amount to buy.");
        delete carForRepurchase;
    }

    //TODO continue from propose driver

    modifier validOffer(uint validTime){require(validTime > now, "Offer expired."); _;}

    modifier greaterThenHalf(uint8 vote){
        require(vote > participantAccts.length / 2, "Not enough approve votes."); _;}

    modifier canJoin (){require(participantAccts.length < 10, "Max 9 participants are allowed by system."); _;}

    modifier onlyManager(){require(msg.sender == manager, "Only manager can call this function."); _;}

    modifier onlyDealer(){require(msg.sender == carDealer, "Only dealer can call this function."); _;}

    modifier onlyDriver(){require(msg.sender == driver.addr, "Only driver can call this function."); _;}

    modifier onlyParticipants(){require(participantCheck[msg.sender] == true, "Only participants can call this function."); _;}

    function () external{}

}