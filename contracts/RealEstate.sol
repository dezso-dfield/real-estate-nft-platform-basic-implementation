// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract RealEstate is ERC721URIStorage, Ownable, ReentrancyGuard {
    uint private tokenCounter;
    mapping(address => bool) public isPlatformOwner;
    address[] public platformOwners;

    struct Property {
        uint id;
        uint price;
        string location;
        bool isPurchased;
        string metadataURI;
    }

    Property[] public properties;

    modifier onlyPlatformOwner() {
        require(isPlatformOwner[msg.sender], "Not a platform owner");
        _;
    }

    constructor() ERC721("RealEstateToken", "RET") {
        isPlatformOwner[msg.sender] = true;
        platformOwners.push(msg.sender);
    }

    receive() external payable {}

    function addPlatformOwner(address newOwner) external onlyPlatformOwner {
        require(newOwner != address(0), "Invalid address");
        require(!isPlatformOwner[newOwner], "Already an owner");
        isPlatformOwner[newOwner] = true;
        platformOwners.push(newOwner);
    }

    function addProperty(uint price, string calldata location, string calldata metadataURI) external { // Removed onlyPlatformOwner modifier
        require(price > 0, "Price must be greater than zero");
        require(bytes(location).length > 0, "Location required");
        require(bytes(metadataURI).length > 0, "Metadata URI required");

        uint propertyId = properties.length;

        properties.push(Property({
            id: propertyId,
            price: price,
            location: location,
            isPurchased: false,
            metadataURI: metadataURI
        }));

        _safeMint(msg.sender, propertyId);
        _setTokenURI(propertyId, metadataURI);
    }

    function buyProperty(uint id) external payable nonReentrant {
        require(id < properties.length, "Invalid property ID");

        Property storage prop = properties[id];
        require(!prop.isPurchased, "Property already sold");
        require(msg.value == prop.price, "Incorrect price");

        address currentOwner = ownerOf(id);
        require(currentOwner != address(0), "Invalid current owner");
        require(currentOwner != msg.sender, "Buyer already owns property");

        prop.isPurchased = true;

        _transfer(currentOwner, msg.sender, id);

        (bool sent, ) = payable(currentOwner).call{value: msg.value}("");
        require(sent, "Payment to seller failed");
    }

    function getProperty(uint id) external view returns (Property memory) {
        require(id < properties.length, "Invalid property ID");
        return properties[id];
    }

    function getProperties() external view returns (Property[] memory) {
        return properties;
    }

    function totalProperties() external view returns (uint) {
        return properties.length;
    }

    function propertyMetadata(uint id) external view returns (string memory) {
        require(_exists(id), "Nonexistent token");
        return tokenURI(id);
    }
}
