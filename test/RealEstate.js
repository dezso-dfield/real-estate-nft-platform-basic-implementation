const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RealEstate", function () {
    let contract;
    let owner, addr1, addr2, addr3;

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
            contract.connect(addr1).addPlatformOwner(addr2.address)
        ).to.be.revertedWith("Not a platform owner");
    });

    it("should allow a platform owner to add a property", async function () {
        const price = ethers.parseEther("1");
        await contract.connect(owner).addProperty(price, "Budapest", "ipfs://metadata-1");
        const prop = await contract.getProperty(0);
        expect(prop.price).to.equal(price);
        expect(prop.location).to.equal("Budapest");
        expect(prop.metadataURI).to.equal("ipfs://metadata-1");
        expect(await contract.ownerOf(0)).to.equal(owner.address);
        expect(await contract.totalProperties()).to.equal(1);
    });

    it("should revert if a non-platform owner tries to add a property", async function () {
        const price = ethers.parseEther("1");
        await expect(
            contract.connect(addr1).addProperty(price, "Budapest", "ipfs://metadata-1")
        ).to.be.revertedWith("Not a platform owner");
    });
    
    it("should allow a user to buy a property", async function () {
        const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
        const price = ethers.parseEther("1");
        await contract.connect(owner).addProperty(price, "Budapest", "ipfs://metadata-1");
        await contract.connect(addr1).buyProperty(0, { value: price });
        expect(await contract.ownerOf(0)).to.equal(addr1.address);
        const prop = await contract.getProperty(0);
        expect(prop.isPurchased).to.equal(true);
        const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
        expect(finalOwnerBalance).to.be.closeTo(initialOwnerBalance + price, ethers.parseEther("0.01"));
    });

    it("should revert if a user tries to buy an already sold property", async function () {
        const price = ethers.parseEther("1");
        await contract.connect(owner).addProperty(price, "Budapest", "ipfs://metadata-1");
        await contract.connect(addr1).buyProperty(0, { value: price });
        await expect(
            contract.connect(addr2).buyProperty(0, { value: price })
        ).to.be.revertedWith("Property already sold");
    });

    it("should revert if a user sends an incorrect price", async function () {
        const price = ethers.parseEther("1");
        await contract.connect(owner).addProperty(price, "Budapest", "ipfs://metadata-1");
        const incorrectPrice = ethers.parseEther("0.5");
        await expect(
            contract.connect(addr1).buyProperty(0, { value: incorrectPrice })
        ).to.be.revertedWith("Incorrect price");
    });

    it("should protect against reentrancy attacks", async function () {
        const price = ethers.parseEther("1");
        await contract.connect(owner).addProperty(price, "Budapest", "ipfs://metadata-1");
        expect(contract.buyProperty(0, { value: price })).to.not.be.revertedWith("ReentrancyGuard: reentrant call");
    });
});