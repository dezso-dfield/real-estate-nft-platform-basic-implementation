import React from 'react';

function PropertyCard({ id, property, web3, contract, account, refreshProperties, isOwnedByUser }) {
    const buyProperty = async () => {
        if (!web3 || !contract || !account) {
            console.error("Web3, contract, or account not initialized.");
            return;
        }

        if (property.isPurchased) {
            alert("This property has already been sold.");
            return;
        }
        
        try {
            // Get the current owner of the token from the contract
            const currentOwner = await contract.methods.ownerOf(id).call();
            if (currentOwner.toLowerCase() === account.toLowerCase()) {
                alert("You already own this property!");
                return;
            }

            // Convert ETH price to Wei for the transaction
            const weiPrice = web3.utils.toWei(property.price.toString(), "wei"); 
            
            console.log("Attempting to buy property:", id);
            console.log("Price (Wei):", weiPrice);
            console.log("From account:", account);

            // Send the transaction to buy the property
            await contract.methods.buyProperty(id).send({ from: account, value: weiPrice });
            console.log("Property purchased successfully!");
            refreshProperties(); // Refresh the list of properties after purchase
        } catch (error) {
            console.error("Error buying property:", error);
            // Display a user-friendly message for transaction failures
            alert("Transaction failed: " + error.message);
        }
    };

    // Determine card background and button styling based on property status and ownership
    const cardBackgroundColor = isOwnedByUser ? "bg-gray-50" : "bg-white"; // Lighter, more neutral background
    const buttonColor = property.isPurchased ? "bg-gray-300" : "bg-blue-600"; // Muted gray for sold, clean blue for buy
    const buttonHoverColor = property.isPurchased ? "hover:bg-gray-300" : "hover:bg-blue-700";
    const buttonText = property.isPurchased ? "Sold" : "Buy Property";

    return (
        <div className={`p-6 rounded-lg shadow-sm flex flex-col justify-between border border-gray-200 ${cardBackgroundColor}`}>
            <div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900">Property ID: {property.id.toString()}</h3>
                <p className="text-gray-700 mb-2">
                    <strong className="font-medium">Location:</strong> {property.location}
                </p>
                <p className="text-gray-700 mb-2">
                    <strong className="font-medium">Price:</strong> {web3 ? web3.utils.fromWei(property.price.toString(), 'ether') : 'N/A'} ETH
                </p>
                <p className="text-gray-700 mb-2">
                    <strong className="font-medium">Owner:</strong>{" "}
                    <span className="font-mono text-xs break-all text-gray-600">{property.owner || 'Loading...'}</span>
                </p>
                <p className="text-gray-700 mb-4">
                    <strong className="font-medium">Status:</strong>{" "}
                    <span className={`font-semibold ${property.isPurchased ? 'text-red-600' : 'text-green-600'}`}>
                        {property.isPurchased ? 'Sold' : 'Available'}
                    </span>
                </p>
                <p className="truncate text-sm text-gray-500">
                    <strong className="font-medium">Metadata URI:</strong> {property.metadataURI}
                </p>
            </div>
            {/* Conditional rendering for the buy button or owned message */}
            {!isOwnedByUser && !property.isPurchased && ( 
                <button
                    onClick={buyProperty}
                    className={`mt-6 w-full ${buttonColor} text-white px-6 py-3 rounded-md font-semibold text-base ${buttonHoverColor} transition duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-300`}
                    disabled={!web3 || !contract || !account || property.isPurchased}
                >
                    {buttonText}
                </button>
            )}
            {isOwnedByUser && (
                <p className="mt-6 text-center text-blue-700 font-semibold text-base bg-blue-100 p-3 rounded-md border border-blue-200">
                    You own this property!
                </p>
            )}
        </div>
    );
}

export default PropertyCard;
