// src/components/PropertyCard.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function PropertyCard({
  property,
  web3,
  contract,
  account,
  refresh,
  isOwnedByUser = false
}) {
  const navigate = useNavigate();

  // Stop click on the buy button from propagating up to the card click
  const buy = async (e) => {
    e.stopPropagation();
    try {
      await contract.methods
        .buyProperty(property.tokenId)
        .send({ from: account, value: property.price });
      refresh();
    } catch (err) {
      alert('Purchase failed: ' + err.message);
    }
  };

  const owned = isOwnedByUser || property.owner.toLowerCase() === account.toLowerCase();
  const sold  = property.isPurchased && !owned;
  const cover = property.cover || (property.images && property.images[0]);

  // Navigate to detail page when the card is clicked
  const handleCardClick = () => {
    navigate(`/listing/${property.tokenId}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="border p-4 rounded shadow flex flex-col cursor-pointer hover:shadow-lg transition"
    >
      {cover && (
        <img
          src={cover}
          alt={property.name || `Property ${property.tokenId}`}
          className="w-full h-40 object-cover rounded mb-4"
        />
      )}

      <h3 className="font-bold mb-2">
        {property.name || `#${property.tokenId}`}
      </h3>
      <p className="text-sm mb-2 truncate">{property.description}</p>
      <p className="mb-1">
        <strong>Location:</strong> {property.location}
      </p>
      <p className="mb-4">
        <strong>Price:</strong>{' '}
        {web3 ? web3.utils.fromWei(property.price, 'ether') : '?'} ETH
      </p>

      <button
        onClick={buy}
        disabled={owned || sold}
        className={`mt-auto py-2 rounded text-white font-semibold ${
          owned    ? 'bg-gray-500 cursor-not-allowed' :
          sold     ? 'bg-red-500 cursor-not-allowed' :
                      'bg-green-600 hover:bg-green-700'
        }`}
      >
        {owned ? 'Owned' : sold ? 'Sold' : 'Buy'}
      </button>
    </div>
  );
}
