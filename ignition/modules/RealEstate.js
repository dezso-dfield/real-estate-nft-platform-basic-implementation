// ignition/modules/RealEstate.js

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("RealEstateModule", (m) => {
  const realEstate = m.contract("RealEstate");

  return { realEstate };
});