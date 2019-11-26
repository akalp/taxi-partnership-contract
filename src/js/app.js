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
    $.getJSON('TaxiPartnership.json', function (data) {
      var TaxiPartnershipArtifact = data;
      App.contracts.TaxiPartnership = TruffleContract(TaxiPartnershipArtifact);

      App.contracts.TaxiPartnership.setProvider(App.web3Provider);

      return App.getGlobals();
    });

    return App.bindEvents();
  },

  bindEvents: function () {
    $(document).on('click', '.btn-join', App.handleJoin);
  },

  getGlobals: async function (adopters, account) {
    var taxiPartnershipInstance = await App.contracts.TaxiPartnership.deployed();
    await taxiPartnershipInstance.manager.call().then(manager => {
      $(document).find('#manager').text(manager);
    }).catch(function (err) {
      console.log(err.message);
    });

    web3.eth.getBalance(taxiPartnershipInstance.address, (err, balance) => {
      balance = web3.fromWei(balance, "ether") + " ETH";
      $(document).find('#total-ether').text(balance);
    });

    await taxiPartnershipInstance.getParticipantCount.call().then(async count => {
      $(document).find('#participants').empty();
      for (var i = 0; i < count; i++) {
        var participant = await taxiPartnershipInstance.participantAccts.call(i)
        $(document).find('#participants').append('<div>' + participant + '</div>');
      }

      web3.eth.getAccounts(async function (error, accounts) {
        if (error) {
          console.log(error);
        }
        var account = accounts[0];
        await taxiPartnershipInstance.participantCheck.call(account).then(async bool => {
        $(document).find('#user-ether').text(bool ? web3.fromWei(await taxiPartnershipInstance.balances.call(account), 'ether') + " ETH":"You are not a participant.");
        $(document).find('.btn-join')[0].disabled = bool;
      });
      });
    }).catch(function (err) {
      console.log(err.message);
    });
  },

  handleJoin: function (event) {
    event.preventDefault();

    var taxiPartnershipInstance;

    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];

      App.contracts.TaxiPartnership.deployed().then(function (instance) {
        taxiPartnershipInstance = instance;
        return taxiPartnershipInstance.join({ from: account, value: web3.toWei(100, 'ether') });
      }).then(function (result) {
        return App.getGlobals();
      }).catch(function (err) {
        console.log(err.message);
      });
    });
  }

};

$(function () {
  $(window).load(function () {
    App.init();
    window.ethereum.on('accountsChanged', function () {
      App.getGlobals();
    })
  });
});
