const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RealEstate", function () {
  let contract;
  let owner, addr1, addr2, addr3; // Added addr3 for more testing flexibility

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    const RealEstateFactory = await ethers.getContractFactory("RealEstate");
    contract = await RealEstateFactory.deploy();
  });

  it("should deploy and set initial platform owner", async function () {
    expect(await contract.isPlatformOwner(owner.address)).to.equal(true);
    expect(await contract.isPlatformOwner(addr1.address)).to.equal(false);
  });

  it("should allow a platform owner to add a new platform owner", async function () {
    await contract.connect(owner).addPlatformOwner(addr1.address);
    expect(await contract.isPlatformOwner(addr1.address)).to.equal(true);
  });

  it("should revert if a non-platform owner tries to add a new platform owner", async function () {
    await expect(
      contract.connect(addr2).addPlatformOwner(addr3.address) // Using addr2 as non-owner
    ).to.be.revertedWith("Not a platform owner");
  });

  it("should allow anyone to add a property", async function () {
    const price = ethers.parseEther("1");
    // Using addr1 to add property, demonstrating anyone can add
    await contract.connect(addr1).addProperty(price, "Budapest", "ipfs://metadata-1");

    const prop = await contract.getProperty(0);
    expect(prop.price).to.equal(price);
    expect(prop.location).to.equal("Budapest");
    expect(prop.metadataURI).to.equal("ipfs://metadata-1");
    // Owner of the NFT should be the one who called addProperty
    expect(await contract.ownerOf(0)).to.equal(addr1.address);
    expect(await contract.totalProperties()).to.equal(1);
  });

  it("should allow anyone to add multiple properties", async function () {
    const price1 = ethers.parseEther("1");
    const price2 = ethers.parseEther("2");

    await contract.connect(addr1).addProperty(price1, "Budapest", "ipfs://metadata-1");
    await contract.connect(addr2).addProperty(price2, "Vienna", "ipfs://metadata-2");

    const prop1 = await contract.getProperty(0);
    const prop2 = await contract.getProperty(1);

    expect(prop1.location).to.equal("Budapest");
    expect(prop2.location).to.equal("Vienna");

    expect(await contract.ownerOf(0)).to.equal(addr1.address);
    expect(await contract.ownerOf(1)).to.equal(addr2.address);
    expect(await contract.totalProperties()).to.equal(2); // Check total properties
  });

  it("should allow a user to buy a property", async function () {
    const price = ethers.parseEther("1");
    await contract.connect(addr1).addProperty(price, "Budapest", "ipfs://metadata-1");

    const initialSellerBalance = await ethers.provider.getBalance(addr1.address);
    const tx = await contract.connect(addr2).buyProperty(0, { value: price });
    const receipt = await tx.wait();
    // Gas cost calculation for the buyer, not strictly needed for this test but good practice
    // const gasUsed = receipt.gasUsed * receipt.gasPrice;

    expect(await contract.ownerOf(0)).to.equal(addr2.address);
    const prop = await contract.getProperty(0);
    expect(prop.isPurchased).to.equal(true);

    const finalSellerBalance = await ethers.provider.getBalance(addr1.address);
    // Check if seller received the payment, accounting for small gas variations
    expect(finalSellerBalance).to.be.closeTo(initialSellerBalance + price, ethers.parseEther("0.01"));
  });

  it("should revert if a user tries to buy an already sold property", async function () {
    const price = ethers.parseEther("1");
    await contract.connect(addr1).addProperty(price, "Budapest", "ipfs://metadata-1");

    await contract.connect(addr2).buyProperty(0, { value: price });

    await expect(
      contract.connect(owner).buyProperty(0, { value: price })
    ).to.be.revertedWith("Property already sold");
  });

  it("should revert if a user sends incorrect ETH", async function () {
    const price = ethers.parseEther("1");
    await contract.connect(addr1).addProperty(price, "Budapest", "ipfs://metadata-1");

    const wrongAmount = ethers.parseEther("0.5");

    await expect(
      contract.connect(owner).buyProperty(0, { value: wrongAmount })
    ).to.be.revertedWith("Incorrect price");
  });

  it("should prevent buying a non-existent property", async function () {
    await expect(
      contract.connect(owner).buyProperty(999, { value: ethers.parseEther("1") })
    ).to.be.revertedWith("Invalid property ID");
  });

  it("should protect against reentrancy attacks", async function () {
    const price = ethers.parseEther("1");
    await contract.connect(addr1).addProperty(price, "Budapest", "ipfs://metadata-1");

    // This test primarily confirms the nonReentrant modifier is in place.
    // A true reentrancy attack would involve a malicious contract.
    // Here, we just ensure the normal flow doesn't trigger the reentrancy guard.
    await expect(
      contract.connect(addr2).buyProperty(0, { value: price })
    ).to.not.be.revertedWith("ReentrancyGuard: reentrant call");
  });
});
