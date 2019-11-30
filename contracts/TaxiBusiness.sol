pragma solidity ^0.5.0;

/// @title Partnership Contract for Taxi Market
/// @author Hasan Akalp

contract TaxiBusiness {
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
        uint lastSalaryPayment; //Last salary payment
    }
    Driver public driver; //Driver who works now.

    struct DriverProposal {
        address payable addr;
        uint salary;
        mapping (address => bool) voted;
        uint8 positiveVoteCount;
    }
    DriverProposal public driverForHire;

    uint public lastExpenseTime; //Last maintenance.
    uint public lastProfitDist; //Last dividend payment


    /// @param _participationFee is the join fee for contract
    /// @param _profitDistTime is time interval for dividend sharing
    /// @param _expenseTime is time interval for car maintenance
    /// @param _expenseCost is car maintenance cost
    constructor(uint _participationFee, uint _profitDistTime, uint _expenseTime, uint _expenseCost) public{
        manager = msg.sender;
        participationFee = _participationFee;
        profitDistTime = _profitDistTime;
        expenseTime = _expenseTime;
        expenseCost = _expenseCost;
        lastProfitDist = now;
    }

    /// @notice First, function checks person can join (only 9 participants are allowed.). Then checks person is already a participant or not. If not, checks msg.value is enough to join. If yes, add person to participants list.
    function join() public payable canJoin{
        require(!participantCheck[msg.sender], "You are already a participant.");
        require(msg.value >= participationFee, "Participation fee is higher than the ether you send.");
        participantCheck[msg.sender] = true;
        participantAccts.push(msg.sender);
    }

    /// @notice Function sets the _carDealer to carDealer variable.
    /// @param _carDealer is address of car dealer.
    function setCarDealer(address payable _carDealer) public onlyManager{
        carDealer = _carDealer;
    }

    /// @notice Function is for proposing a car to partners.
    /// @param carId is id of car
    /// @param price is how much ethers is required to buy it
    /// @param validTime is date when offer ends.
    function carProposeToBusiness(bytes32 carId, uint price, uint validTime) public onlyDealer {
        carForSale = CarProposal({
            id: carId,
            price: price,
            offerValidTime: validTime,
            positiveVoteCount: 0
        });
    }

    /// @notice If offer time is not pass, participants can vote to buy it. Every participants can vote once.
    function approvePurchaseCar() public onlyParticipants validOffer(carForSale.offerValidTime){
        require(!carForSale.voted[msg.sender], "You already voted.");
        carForSale.voted[msg.sender] = true;
        carForSale.positiveVoteCount += 1;
    }

    /// @notice If offer time is not pass and enough votes, function sets owned car and transfers ethers to car dealer.
    function purchaseCar() public onlyManager greaterThenHalf(carForSale.positiveVoteCount) validOffer(carForSale.offerValidTime){
        require(carForSale.id != ownedCar, "You already bought that car.");
        require(address(this).balance > carForSale.price, "Contract does not have enough ether to buy it.");
        ownedCar = carForSale.id;
        lastExpenseTime = now;
        carDealer.transfer(carForSale.price);
        delete carForSale;
        clearMapping(0);
    }

    /// @notice Function for proposing to buy car from partnership
    /// @param carId is id of car (must be equal to ownedCar)
    /// @param price is how much ethers is required to buy it
    /// @param validTime is date when offer ends.
    function repurchaseCarPropose(bytes32 carId, uint price, uint validTime) public onlyDealer{
        require(carId == ownedCar, "There is no car with this id.");
        carForRepurchase = CarProposal({
            id: carId,
            price: price,
            offerValidTime: validTime,
            positiveVoteCount: 0
        });
    }

    /// @notice If offer time is not pass, participants can vote to sell it. Every participants can vote once.
    function approveSellPropose() public onlyParticipants validOffer(carForRepurchase.offerValidTime){
        require(!carForRepurchase.voted[msg.sender], "You already voted.");
        carForRepurchase.voted[msg.sender] = true;
        carForRepurchase.positiveVoteCount += 1;
    }

    /// @notice If offer time is not pass and enough votes and msg.value is enough, function clear ownedCar and carForRepurchase.
    function repurchaseCar() public payable onlyDealer greaterThenHalf(carForRepurchase.positiveVoteCount) validOffer(carForRepurchase.offerValidTime){
        require(msg.value == carForRepurchase.price, "You have to send enough amount to buy.");
        delete ownedCar;
        delete carForRepurchase;
        clearMapping(1);
    }

    /// @notice Function for proposing a driver to partnership
    /// @param driver_addr is address of driver
    /// @param salary is the how much ethers will paid to driver.
    function proposeDriver(address payable driver_addr, uint salary) public onlyManager{
        driverForHire = DriverProposal({
            addr:driver_addr,
            salary:salary,
            positiveVoteCount: 0
        });
    }

    /// @notice Function for approve driver proposal. Every participant can vote once.
    function approveDriver() public onlyParticipants{
        require(!driverForHire.voted[msg.sender], "You already voted.");
        driverForHire.voted[msg.sender] = true;
        driverForHire.positiveVoteCount += 1;
    }

    /// @notice If enough vote and there is no driver, function set new driver.
    function setDriver() public onlyManager greaterThenHalf(driverForHire.positiveVoteCount){
        require(driver.addr == address(0x0), "You already have a driver.");
        driver = Driver({
            addr: driverForHire.addr,
            salary: driverForHire.salary,
            lastSalaryPayment: now
        });
        delete driverForHire;
        clearMapping(2);
    }

    /// @notice If there is a driver, manager can fire driver with this function. Function transfers last salary of driver.
    function fireDriver() public onlyManager{
        require(driver.addr != address(0x0), "There is no driver to fire.");
        driver.addr.transfer(driver.salary);
        delete driver;
    }

    /// @notice Function for gettting payment from customer
    function getCharge() public payable{}

    /// @notice Function to release driver's salary. It works if the driver is present and it is time to pay the salary. The salary is kept in the contract until the salary is withdrawn.
    function releaseSalary() public onlyManager{
        require(driver.addr != address(0x0), "There is no driver to pay.");
        require(now > driver.lastSalaryPayment + 4 weeks, "1 month has not passed since the last payment.");
        driver.lastSalaryPayment = now;
        balances[driver.addr] += driver.salary;
    }

    /// @notice Driver can withdraw his/her salary.
    function getSalary() public onlyDriver{
        require(balances[driver.addr]>0, "You do not have ether in contract.");
        uint driverBalance = balances[driver.addr];
        balances[driver.addr] = 0;
        driver.addr.transfer(driverBalance);
    }

    /// @notice If partnership has a car, and maintenance time of it comes, this function transfers maintenance cost to car dealer.
    function carExpenses() public onlyManager{
        require(ownedCar != 0, "You do not have a car.");
        require(now > lastExpenseTime + expenseTime, "It is not time for car maintenance.");
        lastExpenseTime = now;
        carDealer.transfer(expenseCost);
    }

    /// @notice Function checks time and contract balance. If two of them is enough, function shares the dividends.
    /// @notice When calculating dividends, 6 next driver salary and 1 next maintenance cost are decreased from profit.
    function payDividend() public onlyManager{
        require(now > lastProfitDist + profitDistTime, "It is not time to distribute dividends.");
        uint dividend = address(this).balance - (expenseCost + 6 * driver.salary) / participantAccts.length;
        require(dividend > 0, "Not enough ether to pay dividend.");
        lastProfitDist = now;
        for(uint8 i; i < participantAccts.length; i++){
            balances[participantAccts[i]] += dividend;
        }
    }

    /// @notice Participants can withdraw theirs ethers.
    function getDividend() public onlyParticipants{
        require(balances[msg.sender] > 0, "You do not have ether in contract.");
        uint balance = balances[msg.sender];
        balances[msg.sender] = 0;
        msg.sender.transfer(balance);
    }

    function () external{}

    /// @notice When delete a struct, mapping in it not cleared. So in this function, delete them one by one.
    /// @param k To choose which mappings to clear.
    function clearMapping(uint8 k) private {
        for(uint8 i = 0; i < participantAccts.length; i++){
            if(k==0){
                // carForSale voted
                delete carForSale.voted[participantAccts[i]];
            }else if(k==1){
                // carForRepurchase voted
                delete carForRepurchase.voted[participantAccts[i]];
            }else{
                // driverForHire voted
                delete driverForHire.voted[participantAccts[i]];
            }
        }
    }


    modifier validOffer(uint validTime){require(validTime > now, "Offer expired."); _;}

    modifier greaterThenHalf(uint8 vote){
        require(vote > participantAccts.length / 2, "Not enough approve votes."); _;}

    modifier canJoin (){require(participantAccts.length < 9, "Max 9 participants are allowed by system."); _;}

    modifier onlyManager(){require(msg.sender == manager, "Only manager can call this function."); _;}

    modifier onlyDealer(){require(msg.sender == carDealer, "Only dealer can call this function."); _;}

    modifier onlyDriver(){require(msg.sender == driver.addr, "Only driver can call this function."); _;}

    modifier onlyParticipants(){require(participantCheck[msg.sender] == true, "Only participants can call this function."); _;}
}