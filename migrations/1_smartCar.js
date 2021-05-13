//const SmartLeaseRegistry = artifacts.require("SmartLeaseRegistry");
const SmartCar = artifacts.require("SmartCar");
// const tenantCapacity = require("../config.js").tenantCapacity;

module.exports = function(deployer) {
  //deployer.deploy(SmartLeaseRegistry);
  deployer.deploy(SmartCar);
};