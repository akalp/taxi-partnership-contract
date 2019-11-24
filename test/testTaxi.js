const TaxiPartnership = artifacts.require("TaxiPartnership")
const Web3 = require('web3')
const web3 = new Web3("http://127.0.0.1:7545")

contract("TaxiPartnership", (accounts) => {
    let tp;
    var manager = 0;
    var participants = [1,2,3,4,5,6,7,8,9];
    var carDealer = 19;
    var driver = 18;
    var secondDriver = 17;

    var carPropasal = {id:web3.utils.fromAscii((1).toString()), price:web3.utils.toWei('1', 'ether'), offerTime:new Date("11/26/2019").getTime()};
    var carRepurchaseProposal = {id:web3.utils.fromAscii((1).toString()), price:web3.utils.toWei('1', 'ether'), offerTime:new Date("11/26/2019").getTime()};
    var falseCarRepurchaseProposal = {id:web3.utils.fromAscii((100).toString()), price:web3.utils.toWei('1', 'ether'), offerTime:new Date("11/26/2019").getTime()}
    var driverProposal;

    beforeEach('setup contract for each test', async function () {
        tp = await TaxiPartnership.deployed();
    });

    it("join with less ether", async () => {
        var balance = web3.eth.getBalance(tp.address);
        try{
            await tp.join({ value: 10e18, from:accounts[participants[0]]});    
        }
        catch(error){
            var balance2 = web3.eth.getBalance(tp.balance);
            assert(balance == balance2, "Ether gone.");
            assert(error.toString().includes('ether you send'), error.toString());
        }
    });
    
    it("join", async () => {
        try{
            for(var i=0; i<participants.length; i++){
                var balance = await web3.eth.getBalance(tp.address);
                await tp.join({ value: 100e18, from:accounts[i]});
                var balance2 = await web3.eth.getBalance(tp.address);
                assert(balance + web3.utils.toWei('100', 'ether') == balance2, "Ether did not transfer to contract.")
            }
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
            assert(balance == balance2, "Ether gone.")
            assert(error.toString().includes('You are already'), error.toString());
        }
    });

    it("join extra", async () => {
        var balance = await web3.eth.getBalance(tp.address);
        try{
            await tp.join({ value: 100e18, from:accounts[10]});    
        }
        catch(error){
            var balance2 = await web3.eth.getBalance(tp.address);
            assert(balance == balance2, "Ether gone.")
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
        try{
            for(var i=1; i<4; i++){
                await tp.approvePurchaseCar({from: accounts[i]});
            }
            await tp.purchaseCar();
        }catch(error){
            assert(error.toString().includes('Not enough'), error.toString());
        }
    });

    it("purchase car with enough vote", async () => {
        try{
            for(var i=4; i<7; i++){
                await tp.approvePurchaseCar({from: accounts[i]});
            }
            await tp.purchaseCar();
        }catch(error){
            assert(false, error.toString());
        }
    });





})