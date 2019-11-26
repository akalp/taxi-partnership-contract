pragma solidity ^0.5.0;

contract TaxiPartnership {
    mapping (address => uint) public balances;

    address payable[] public participantAccts;
    mapping (address => bool) public participantCheck;

    address public manager;
    address payable public carDealer;

    uint public participationFee;
    uint public expenseTime; //Time required for expenses
    uint public profitDistTime; //Time required for profit distribution
    uint public expenseCost;

    struct CarProposal {
        bytes32 id;
        uint price;
        uint offerValidTime;
        mapping (address => bool) voted;
        uint8 positiveVoteCount;
    }

    bytes32 public ownedCar;
    CarProposal public carForSale; //Car which is selled by carDealer
    CarProposal public carForRepurchase; //Car which is wanted to buy by carDealer

    struct Driver {
        address payable addr;
        uint salary;
        uint lastSalaryPayment; //When the next salary will be given to the driver.
    }
    Driver public driver; //Driver who works now.

    struct DriverProposal {
        address payable addr;
        uint salary;
        mapping (address => bool) voted;
        uint8 positiveVoteCount;
    }
    DriverProposal public driverForHire;

    uint public lastExpenseTime; //When the next expense will be paid.
    uint public lastProfitDist; //When to distribute profits.

    constructor(uint _participationFee, uint _profitDistTime, uint _expenseTime, uint _expenseCost) public{
        manager = msg.sender;
        participationFee = _participationFee;
        profitDistTime = _profitDistTime;
        expenseTime = _expenseTime;
        expenseCost = _expenseCost;
        lastExpenseTime = now;
        lastProfitDist = now;
    }

    function join() public payable canJoin{
        require(!participantCheck[msg.sender], "You are already a participant.");
        require(msg.value >= participationFee, "Participation fee is higher than the ether you send.");
        participantCheck[msg.sender] = true;
        participantAccts.push(msg.sender) - 1;
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
        require(carForSale.id != ownedCar, "You already bought that car.");
        require(address(this).balance > carForSale.price, "Contract does not have enough ether to buy it.");
        ownedCar = carForSale.id;
        carDealer.transfer(carForSale.price);
        delete carForSale;
    }

    function repurchaseCarPropose(bytes32 carId, uint price, uint validTime) public onlyDealer{
        require(carId == ownedCar, "There is no car with this id.");
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
        delete ownedCar;
        delete carForRepurchase;
    }

    function proposeDriver(address payable driver_addr, uint salary) public onlyManager{
        driverForHire = DriverProposal({
            addr:driver_addr,
            salary:salary,
            positiveVoteCount: 0
        });
    }

    function approveDriver() public onlyParticipants{
        require(!driverForHire.voted[msg.sender], "You already voted.");
        driverForHire.voted[msg.sender] = true;
        driverForHire.positiveVoteCount += 1;
    }

    function setDriver() public onlyManager greaterThenHalf(driverForHire.positiveVoteCount){
        require(driver.addr == address(0x0), "You already have a driver.");
        driver = Driver({
            addr: driverForHire.addr,
            salary: driverForHire.salary,
            lastSalaryPayment: now
        });
        delete driverForHire;
    }

    function fireDriver() public onlyManager{
        require(driver.addr != address(0x0), "There is no driver to fire.");
        driver.addr.transfer(driver.salary);
        delete driver;
    }

    function getCharge() public payable{}

    function releaseSalary() public onlyManager{
        require(now > driver.lastSalaryPayment + 4 weeks, "1 month has not passed since the last payment.");
        driver.lastSalaryPayment = now;
        balances[driver.addr] += driver.salary;
    }

    function getSalary() public onlyDriver{
        require(balances[driver.addr]>0, "You do not have ether in contract.");
        uint driverBalance = balances[driver.addr];
        balances[driver.addr] = 0;
        driver.addr.transfer(driverBalance);
    }

    function carExpenses() public onlyManager{
        require(now > lastExpenseTime + expenseTime, "It is not time for car maintenance.");
        lastExpenseTime = now;
        carDealer.transfer(expenseCost);
    }

    function payDividend() public onlyManager{
        require(now > lastProfitDist + profitDistTime, "It is not time to distribute dividends.");
        lastProfitDist = now;
        uint dividend = address(this).balance - (expenseCost + 6 * driver.salary) / participantAccts.length;
        for(uint8 i; i < participantAccts.length; i++){
            balances[participantAccts[i]] += dividend;
        }
    }

    function getDividend() public onlyParticipants{
        require(balances[msg.sender] > 0, "You do not have ether in contract.");
        uint balance = balances[msg.sender];
        balances[msg.sender] = 0;
        msg.sender.transfer(balance);
    }


    modifier validOffer(uint validTime){require(validTime > now, "Offer expired."); _;}

    modifier greaterThenHalf(uint8 vote){
        require(vote > participantAccts.length / 2, "Not enough approve votes."); _;}

    modifier canJoin (){require(participantAccts.length < 9, "Max 9 participants are allowed by system."); _;}

    modifier onlyManager(){require(msg.sender == manager, "Only manager can call this function."); _;}

    modifier onlyDealer(){require(msg.sender == carDealer, "Only dealer can call this function."); _;}

    modifier onlyDriver(){require(msg.sender == driver.addr, "Only driver can call this function."); _;}

    modifier onlyParticipants(){require(participantCheck[msg.sender] == true, "Only participants can call this function."); _;}

    function () external{}


    function getParticipantCount() public view returns(uint){
        return participantAccts.length;
    }

    /* TODO: getter for carforsale, carforpurchase, driver, driverproposal  */

}