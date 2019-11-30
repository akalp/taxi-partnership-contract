const TaxiBusiness = artifacts.require("TaxiBusiness");

module.exports = function(deployer) {
  deployer.deploy(TaxiBusiness, (100e18).toString(), 15778800, 15778800, (10e18).toString());
};
