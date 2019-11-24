const TaxiPartnership = artifacts.require("TaxiPartnership");

module.exports = function(deployer) {
  deployer.deploy(TaxiPartnership, (100e18).toString(), 15778800, 15778800, (10e18).toString());
};
