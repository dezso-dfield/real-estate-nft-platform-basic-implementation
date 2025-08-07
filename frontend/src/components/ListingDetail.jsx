// src/components/ListingDetail.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function ListingDetail({ web3, contract }) {
  const { tokenId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      const p = await contract.methods.getProperty(tokenId).call();
      let meta = {};
      try {
        const uri = p.metadataURI.startsWith('ipfs://')
          ? 'https://ipfs.io/ipfs/' + p.metadataURI.split('ipfs://')[1]
          : p.metadataURI;
        meta = await fetch(uri).then(r => r.json());
      } catch {}
      setData({ ...p, ...meta });
    })();
  }, [contract, tokenId]);

  if (!data) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded shadow">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 text-blue-600 hover:underline"
      >
        ← Back
      </button>
      <h1 className="text-2xl font-bold mb-2">{data.name}</h1>
      <p className="mb-4">{data.description}</p>

      {data.images && data.images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {data.images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`Property image ${i + 1}`}
              className="w-full h-40 object-cover rounded"
            />
          ))}
        </div>
      )}

      <p className="mb-1">
        <strong>Location:</strong> {data.location}
      </p>
      <p>
        <strong>Price:</strong>{' '}
        {web3 ? web3.utils.fromWei(data.price, 'ether') : '?'} ETH
      </p>
    </div>
  );
}
