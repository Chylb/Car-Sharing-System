//const SmartLeaseRegistry = artifacts.require("SmartLeaseRegistry");
const SmartCar = artifacts.require("SmartCar");
// const tenantCapacity = require("../config.js").tenantCapacity;

module.exports = function (deployer, network, accounts) {
  if (accounts) {
    deployer.deploy(SmartCar, { from: accounts[0], value: web3.utils.toWei('5', 'ether') });
  };
};