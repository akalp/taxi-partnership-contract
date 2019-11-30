App = {
  web3Provider: null,
  contracts: {},

  init: async function () {
    return await App.initWeb3();
  },

  initWeb3: async function () {
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      try {
        await window.ethereum.enable();
      } catch (error) {
        console.error("User denied account access");
      }
    } else if (window.web3) {
      App.web3Provider = window.web3.currentProvider;
    } else {
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost/7545');
    }
    web3 = new Web3(App.web3Provider);

    return App.initContract();
  },

  initContract: function () {
    $.getJSON('TaxiBusiness.json', function (data) {
      var TaxiBusinessArtifact = data;
      App.contracts.TaxiBusiness = TruffleContract(TaxiBusinessArtifact);

      App.contracts.TaxiBusiness.setProvider(App.web3Provider);

      return App.getGlobals();
    });

    return App.bindEvents();
  },

  bindEvents: function () {
    $(document).on('click', '#btn-join', App.handleJoin);
  },

  getGlobals: async function () {
    var TaxiBusinessInstance = await App.contracts.TaxiBusiness.deployed();

    await TaxiBusinessInstance.manager.call().then(manager => {
      $('#manager').text(manager);
    }).catch(function (err) {
      console.log(err.message);
    });

    await TaxiBusinessInstance.ownedCar.call().then(async carId => {
      if (carId == 0) $('#owned-car').text("There is no car.");
      else {
        $('#owned-car').text("Car ID: " + carId);
        await TaxiBusinessInstance.lastExpenseTime.call().then(time => {
          var time = new Date(1000 * lpd);
          time = new Date(time.setMonth(time.getMonth() + 6));
          $('#next-expense').text("Next expense time: " + time);
        });
      }
    });

    web3.eth.getBalance(TaxiBusinessInstance.address, (err, balance) => {
      if (err) {
        console.log(err);
      } else {
        balance = web3.fromWei(balance, "ether") + " ETH";
        $('#total-ether').text(balance);
      }
    });

    // fill dividend time
    await TaxiBusinessInstance.lastProfitDist.call().then(lpd => {
      var time = new Date(1000 * lpd);
      time = new Date(time.setMonth(time.getMonth() + 6));
      $('#next-dividend').text(time);
    });

    // fill participants
    await TaxiBusinessInstance.getParticipantCount.call().then(async count => {
      $('#participants').empty();
      for (var i = 0; i < count; i++) {
        var participant = await TaxiBusinessInstance.participantAccts.call(i)
        $('#participants').append('<div>' + participant + '</div>');
      }

      // Check according account type
      web3.eth.getAccounts(async function (error, accounts) {
        if (error) {
          console.log(error);
        }
        var account = accounts[0];

        // if accout participant
        await TaxiBusinessInstance.participantCheck.call(account).then(async bool => {
          $('#user-ether').text(bool ? web3.fromWei(await TaxiBusinessInstance.balances.call(account), 'ether') + " ETH" : "You are not a participant.");
          $('#btn-join').disabled = bool;
          if (bool) {
            $('#btn-join').text('Joined!');

            await TaxiBusinessInstance.carForSale.call().then(test => {
              if (test[0] != 0 && test[2] != 0 && new Date(test[2]) < Date.now()) {
                $('#carbuy-proposal').show();
                $('#carbuy-id').text(test[0]);
                $('#carbuy-price').text(web3.fromWei(test[1], 'ether') + " ETH");
                $('#carbuy-time').text("Offer valid till: " + new Date(test[2]));
                $('#btn-buycar-vote').show();
              }
            });
            await TaxiBusinessInstance.carForRepurchase.call().then(test => {
              if (test[0] != 0 && test[2] != 0 && new Date(test[2]) < Date.now()) {
                $('#carsell-proposal').show();
                $('#carsell-id').text(test[0]);
                $('#carsell-price').text(web3.fromWei(test[1], 'ether') + " ETH");
                $('#carsell-time').text("Offer valid till: " + new Date(test[2]));
                $('#btn-sellcar-vote').show();
              }
            });
          } else {
            await TaxiBusinessInstance.participationFee.call().then(fee => {
              fee = web3.fromWei(fee, 'ether') + " ETH";
              $('#join-price').text(fee);
            }).catch(function (err) {
              console.log(err.message);
            });
          }
        });

        // if account manager
        if (account === await TaxiBusinessInstance.manager.call()) {
          console.log(1)
          await TaxiBusinessInstance.carForSale.call().then(test => {
            if (test[0] != 0 && new Date(test[2]) < Date.now())
              $('#btn-buycar').show();
            $('#btn-buycar').text("Vote: " + test[3]);
          });
          await TaxiBusinessInstance.carForRepurchase.call().then(test => {
            if (test[0] != 0 && new Date(test[2]) < Date.now())
              $('#btn-sellcar').show();
            $('#btn-sellcar').text("Vote: " + test[3]);
          });
        }


      });
    }).catch(function (err) {
      console.log(err.message);
    });
  },

  handleJoin: function (event) {
    event.preventDefault();

    var TaxiBusinessInstance;

    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];

      App.contracts.TaxiBusiness.deployed().then(function (instance) {
        TaxiBusinessInstance = instance;
        return TaxiBusinessInstance.join({ from: account, value: web3.toWei(100, 'ether') });
      }).then(function (result) {
        return App.getGlobals();
      }).catch(function (err) {
        console.log(err.message);
      });
    });
  }

};

$(function () {
  $(window).on('load', function () {
    App.init();
    window.ethereum.on('accountsChanged', function () {
      App.getGlobals();
    })
  });
});
