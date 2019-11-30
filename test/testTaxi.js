const TaxiBusiness = artifacts.require("TaxiBusiness")
const Web3 = require('web3')
const web3 = new Web3("http://127.0.0.1:7545")

contract("TaxiBusiness", (accounts) => {
    let tp;
    var manager = 0;
    var participants = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    var carDealer = 19;
    var driver = 18;
    var secondDriver = 17;

    var carPropasal = { id: web3.utils.fromAscii((1).toString()), price: web3.utils.toWei('1', 'ether'), offerTime: new Date("11/26/2019").getTime() };
    var carRepurchaseProposal = { id: web3.utils.fromAscii((1).toString()), price: web3.utils.toWei('1', 'ether'), offerTime: new Date("11/26/2019").getTime() };
    var falseCarRepurchaseProposal = { id: web3.utils.fromAscii((100).toString()), price: web3.utils.toWei('1', 'ether'), offerTime: new Date("11/26/2019").getTime() }
    var driverProposal = { addr: accounts[driver], salary: web3.utils.toWei('2', 'ether') };

    beforeEach('setup contract for each test', async function () {
        tp = await TaxiBusiness.at('0x17235a29a53d36094792dc8A178c295826F7faC0');
    });

    it("join with less ether", async () => {
        var balance = await web3.eth.getBalance(tp.address);
        try{
            await tp.join({ value: 10e18, from:accounts[participants[0]]});    
        }
        catch(error){
            var balance2 = await web3.eth.getBalance(tp.address);
            assert(parseInt(balance) === parseInt(balance2), "Ether gone from participant 0.");
            assert(error.toString().includes('ether you send'), error.toString());
        }
    });

    it("join", async () => {
        var balance = await web3.eth.getBalance(tp.address);
        try{
            await tp.join({ value: 100e18, from:accounts[participants[0]]});
            balance2 = await web3.eth.getBalance(tp.address);
            assert(balance < parseInt(balance2), "Ether not come to contract")
        }catch(error){
            assert(false, error.toString());
        }
    });

    it("join twice", async () => {
        var balance = await web3.eth.getBalance(tp.address);
        try{
            await tp.join({ value: 100e18, from:accounts[participants[0]]});
        }catch(error){
            balance2 = await web3.eth.getBalance(tp.address);
            assert(parseInt(balance) === parseInt(balance2), "Ether gone from participant 0.")
            assert(error.toString().includes('You are already'), error.toString());
        }
    });

    it("join", async () => {
        try{
            for(var i=1; i<participants.length; i++){
                var balance = await web3.eth.getBalance(tp.address);
                await tp.join({ value: 100e18, from:accounts[participants[i]]});
                var balance2 = await web3.eth.getBalance(tp.address);
                assert(parseInt(balance) + parseInt(web3.utils.toWei('100', 'ether')) === parseInt(balance2), "Ether did not transfer to contract.")
            }
        }catch(error){
            assert(false, error.toString());
        }
    });

    it("join extra", async () => {
        var balance = await web3.eth.getBalance(tp.address);
        try{
            await tp.join({ value: 100e18, from:accounts[10]});
            assert(false, "joined")
        }
        catch(error){
            var balance2 = await web3.eth.getBalance(tp.address);
            assert(parseInt(balance) === parseInt(balance2), "Ether gone.")
            assert(error.toString().includes('Max 9'), error.toString());
        }
    });

    it("set car dealer f/manager", async () =>{
        try{
            await tp.setCarDealer(accounts[carDealer]);
        }catch(error){
            assert(false, error.toString());
        }
    })

    it("set car dealer f/another", async () =>{
        try{
            await tp.setCarDealer(accounts[carDealer], {from: accounts[1]});
        }catch(error){
            assert(error.toString().includes('Only manager'), error.toString());
        }
    });

    it("car proposal f/carDealer", async () =>{
        try{
            await tp.carProposeToBusiness(carPropasal.id, carPropasal.price, carPropasal.offerTime, {from: accounts[carDealer]});
        }catch(error){
            assert(false, error.toString());
        }
    });

    it("car proposal f/manager", async () =>{
        try{
            await tp.carProposeToBusiness(carPropasal.id, carPropasal.price, carPropasal.offerTime, {from: accounts[manager]});
        }catch(error){
            assert(error.toString().includes('Only dealer'), error.toString());
        }
    });

    it("approve car proposal f/no participant", async () => {
        try{
            await tp.approvePurchaseCar({from: accounts[14]});
        }catch(error){
            assert(error.toString().includes('Only participants'), error.toString());
        }
    });

    it("approve car proposal", async () => {
        try{
            await tp.approvePurchaseCar({from: accounts[participants[0]]});
        }catch(error){
            assert(false, error.toString());
        }
    });

    it("approve car proposal again", async () => {
        try{
            await tp.approvePurchaseCar({from: accounts[participants[0]]});
        }catch(error){
            assert(error.toString().includes('You already'), error.toString());
        }
    });

    it("purchase car with not enough vote", async () => {
        var balance = await web3.eth.getBalance(tp.address);
        try{
            for(var i=1; i<4; i++){
                await tp.approvePurchaseCar({from: accounts[participants[i]]});
            }
            await tp.purchaseCar({from:accounts[manager]});
        }catch(error){
            var balance2 = await web3.eth.getBalance(tp.address);
            assert(parseInt(balance) == parseInt(balance2), "Ether gone from contract");
            assert(error.toString().includes('Not enough'), error.toString());
        }
    });

    it("purchase car with enough vote", async () => {
        var balance = await web3.eth.getBalance(tp.address);
        try{
            for(var i=4; i<7; i++){
                await tp.approvePurchaseCar({from: accounts[participants[i]]});
            }
            await tp.purchaseCar({from:accounts[manager]});
            var balance2 = await web3.eth.getBalance(tp.address);
            assert(balance > parseInt(balance2), "Ether not gone from contract");
            var a = await tp.carForSale();
            assert(a.id == "0x0000000000000000000000000000000000000000000000000000000000000000", "carForSale is not deleted.");
        }catch(error){
            assert(false, error.toString());
        }
    });

    it("repurchase proposal f/manager", async () =>{
        try{
            await tp.repurchaseCarPropose(carPropasal.id, carPropasal.price, carPropasal.offerTime, {from: accounts[manager]});
        }catch(error){
            assert(error.toString().includes('Only dealer'), error.toString());
        }
    });

    it("repurchase car proposal f/carDealer w/different carid", async () =>{
        try{
            await tp.repurchaseCarPropose(falseCarRepurchaseProposal.id, falseCarRepurchaseProposal.price, falseCarRepurchaseProposal.offerTime, {from: accounts[carDealer]});
        }catch(error){
            assert(error.toString().includes('no car with this'), error.toString());
        }
    });

    it("repurchase car proposal f/carDealer w/correct carid", async () =>{
        try{
            await tp.repurchaseCarPropose(carRepurchaseProposal.id, carRepurchaseProposal.price, carPropasal.offerTime, {from: accounts[carDealer]});
        }catch(error){
            assert(false, error.toString());
        }
    });

    it("approve repurchase car proposal", async () => {
        try{
            await tp.approveSellPropose({from: accounts[participants[0]]});
        }catch(error){
            assert(false, error.toString());
        }
    });

    it("approve repurchase car proposal again", async () => {
        try{
            await tp.approveSellPropose({from: accounts[participants[0]]});
        }catch(error){
            assert(error.toString().includes('You already'), error.toString());
        }
    });

    it("repurchase car with not enough vote", async () => {
        var balance = await web3.eth.getBalance(tp.address);
        try{
            for(var i=1; i<4; i++){
                await tp.approveSellPropose({from: accounts[participants[i]]});
            }
            await tp.repurchaseCar({from:accounts[carDealer], value: carRepurchaseProposal.price});
        }catch(error){
            var balance2 = await web3.eth.getBalance(tp.address);
            assert(parseInt(balance) == parseInt(balance2), "Ether gone from contract");
            assert(error.toString().includes('Not enough'), error.toString());
        }
    });

    it("repurchase car with enough vote and not correct amount ether", async () => {
        var balance = await web3.eth.getBalance(tp.address);
        try{
            for(var i=4; i<7; i++){
                await tp.approveSellPropose({from: accounts[participants[i]]});
            } 
            await tp.repurchaseCar({from:accounts[carDealer], value: web3.utils.toWei('100', 'ether')});
            var a = await tp.carForSale();
            assert(a.id == "0x0000000000000000000000000000000000000000000000000000000000000000", "carForRepurchase is not deleted.");
        }catch(error){
            assert(error.toString().includes("send enough amount"), error.toString());
            var balance2 = await web3.eth.getBalance(tp.address);
            assert(parseInt(balance) == parseInt(balance2), "Ethers gone from carDealer")
        }
    });

    it("repurchase car with enough vote and correct amount ether", async () => {
        var balance = await web3.eth.getBalance(tp.address);
        try{
            await tp.repurchaseCar({from:accounts[carDealer], value: carRepurchaseProposal.price});
            var balance2 = await web3.eth.getBalance(tp.address);
            assert(balance < parseInt(balance2), "Ethers not send to contract");
            var a = await tp.carForSale();
            assert(a.id == "0x0000000000000000000000000000000000000000000000000000000000000000", "carForRepurchase is not deleted.");
        }catch(error){
            assert(false, error.toString());
        }
    });

    it("car proposal f/carDealer 2", async () =>{
        try{
            await tp.carProposeToBusiness(carPropasal.id, carPropasal.price, carPropasal.offerTime, {from: accounts[carDealer]});
        }catch(error){
            assert(false, error.toString());
        }
    });

    it("purchase car with enough vote 2", async () => {
        try{
            for(var i=1; i<7; i++){
                await tp.approvePurchaseCar({from: accounts[participants[i]]});
            }
            await tp.purchaseCar({from:accounts[manager]});
            var a = await tp.carForSale();
            assert(a.id == "0x0000000000000000000000000000000000000000000000000000000000000000", "carForSale is not deleted.");
        }catch(error){
            assert(false, error.toString());
        }
    });

    it('get charge', async () => {
        var balance = await web3.eth.getBalance(tp.address);
        try{
            await tp.getCharge({from:accounts[15], value:web3.utils.toWei("1", 'ether')})
            var balance2 = await web3.eth.getBalance(tp.address);
            assert(balance < balance2, "Ethers not send to contract");
        }catch(error){
            assert(false, error.toString());
        }
    });

    it('get charge w/not enough ether in account', async () => {
        var balance = await web3.eth.getBalance(tp.address);
        try{
            await tp.getCharge({from:accounts[15], value:web3.utils.toWei("1000000", 'ether')})
            var balance2 = await web3.eth.getBalance(tp.address);
            assert(balance < balance2, "Ethers not send to contract");
        }catch(error){
            assert(error.toString().includes("sender doesn't have enough funds"), error.toString());
        }
    });

    it('car expenses /w not time passed', async () => {
        var balance = await web3.eth.getBalance(tp.address);
        try{
            await tp.carExpenses({from:accounts[manager]});
            var balance2 = await web3.eth.getBalance(tp.address);
            assert(balance == balance2, "Ether gone from contract.");
        }catch(error){
            var balance2 = await web3.eth.getBalance(tp.address);
            assert(balance == balance2, "Ether gone from contract.");
            assert(error.toString().includes("for car maintenance"), error.toString());
        }
    });

    it('pay dividend /w not time passed', async () => {
        var balance = await web3.eth.getBalance(tp.address);
        try{
            await tp.payDividend({from:accounts[manager]});
            var balance2 = await web3.eth.getBalance(tp.address);
            assert(balance == balance2, "Ether gone from contract.");
        }catch(error){
            var balance2 = await web3.eth.getBalance(tp.address);
            assert(balance == balance2, "Ether gone from contract.");
            assert(error.toString().includes("time to distribute dividends"), error.toString());
        }
    });

    it('driver propose, not enough vote, set', async () => {
        try {
            await tp.proposeDriver(driverProposal.addr, driverProposal.salary);
            for (var i = 0; i < 4; i++) {
                await tp.approveDriver({ from: accounts[participants[i]] })
            }
            await tp.setDriver({from:accounts[manager]});
        } catch (error) {
            assert(error.toString().includes("Not enough approve"), error.toString());
        }
    });

    it('driver set, enough vote', async () => {
        try {
            for (var i = 4; i < participants.length; i++) {
                await tp.approveDriver({ from: accounts[participants[i]] })
            }
            await tp.setDriver({from:accounts[manager]});
        } catch (error) {
            assert(false, error.toString());
        }
    });

    it('release salary /w not time passed', async () => {
        var balance = await web3.eth.getBalance(tp.address);
        try {
            await tp.releaseSalary({from:accounts[manager]});
            var balance2 = await web3.eth.getBalance(tp.address);
            assert(balance == balance2, "Ether gone from contract.");
        } catch (error) {
            var balance2 = await web3.eth.getBalance(tp.address);
            assert(balance == balance2, "Ether gone from contract.");
            assert(error.toString().includes("has not passed since"), error.toString());
        }
    });

    it('fire driver w/no manager', async () => {
        try{
            await tp.fireDriver({from:accounts[18]})
        }catch(error){
            assert(error.toString().includes("manager"), error.toString());
        }
    });

    it('fire driver', async () => {
        try{
            await tp.fireDriver({from:accounts[manager]})
        }catch(error){
            assert(false, error.toString());
        }
    });

    it('fire driver /w no driver', async () => {
        try{
            await tp.fireDriver({from:accounts[manager]})
        }catch(error){
            assert(error.toString("no driver"), error.toString());
        }
    });

})