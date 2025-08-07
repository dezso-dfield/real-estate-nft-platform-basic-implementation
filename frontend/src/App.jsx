// src/App.jsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import Web3 from 'web3';
import abi from './abi/RealEstate.json';
import PropertyCard from './components/PropertyCard';
import ListingDetail from './components/ListingDetail';

const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const BACKEND = 'http://localhost:4000';

function Home({ web3, contract, account, properties, userProperties, loadBlockchainData }) {
  const navigate = useNavigate();
  const [titleInput, setTitleInput]             = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [priceInput, setPriceInput]             = useState('');
  const [locationInput, setLocationInput]       = useState('');
  const [imageFiles, setImageFiles]             = useState([]);
  const [imagePreviews, setImagePreviews]       = useState([]);
  const [coverIndex, setCoverIndex]             = useState(0);

  const uploadImages = async (files) => {
    const toUpload = files.slice(0, 5);
    const form = new FormData();
    toUpload.forEach(f => form.append('images', f));
    const res = await fetch(`${BACKEND}/api/upload-multiple`, { method: 'POST', body: form });
    if (!res.ok) throw new Error('Image upload failed');
    const { urls } = await res.json();
    return urls;
  };

  const uploadMetadata = async (json) => {
    const res = await fetch(`${BACKEND}/api/upload-json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(json)
    });
    if (!res.ok) throw new Error('Metadata upload failed');
    const { url } = await res.json();
    return url;
  };

  const handleImageChange = (e) => {
    const newFiles = Array.from(e.target.files);
    const combinedFiles = [...imageFiles, ...newFiles].slice(0, 5);
    setImageFiles(combinedFiles);

    const newPreviews = newFiles.map(f => URL.createObjectURL(f));
    const combinedPreviews = [...imagePreviews, ...newPreviews].slice(0, 5);
    setImagePreviews(combinedPreviews);

    setCoverIndex(idx => Math.min(idx, combinedPreviews.length - 1));
  };

  const addProperty = async (e) => {
    e.preventDefault();
    if (!web3 || !contract || !account || imageFiles.length === 0) return;
    try {
      const urls = await uploadImages(imageFiles);
      const metadata = {
        name:        titleInput,
        description: descriptionInput,
        images:      urls,
        cover:       urls[coverIndex],
        attributes: [
          { trait_type: 'Location', value: locationInput },
          { trait_type: 'Price (ETH)', value: priceInput }
        ]
      };
      const metaUrl = await uploadMetadata(metadata);
      const wei = web3.utils.toWei(priceInput, 'ether');
      await contract.methods.addProperty(wei, locationInput, metaUrl).send({ from: account });
      // reset
      setTitleInput('');
      setDescriptionInput('');
      setPriceInput('');
      setLocationInput('');
      setImageFiles([]);
      setImagePreviews([]);
      setCoverIndex(0);
      await loadBlockchainData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-6 rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Real Estate DApp</h1>

      {/* New Listing Form */}
      <form onSubmit={addProperty} className="mb-8">
        <div className="grid gap-4 md:grid-cols-2">
          <input
            type="text"
            placeholder="Title"
            value={titleInput}
            onChange={e => setTitleInput(e.target.value)}
            required
            className="border p-2 rounded"
          />
          <input
            type="text"
            placeholder="Location"
            value={locationInput}
            onChange={e => setLocationInput(e.target.value)}
            required
            className="border p-2 rounded"
          />
          <input
            type="number"
            placeholder="Price in ETH"
            value={priceInput}
            onChange={e => setPriceInput(e.target.value)}
            required
            step="any"
            className="border p-2 rounded"
          />
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="border p-2 rounded"
          />
        </div>

        {imagePreviews.length > 0 && (
          <div className="flex gap-2 mt-4">
            {imagePreviews.map((src, i) => (
              <div
                key={i}
                className={coverIndex === i ? 'border-2 border-blue-500' : 'border'}
              >
                <img
                  src={src}
                  alt="preview"
                  onClick={() => setCoverIndex(i)}
                  className="w-24 h-24 object-cover cursor-pointer"
                />
              </div>
            ))}
          </div>
        )}

        <button
          type="submit"
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add Property
        </button>
      </form>

      {/* My Properties */}
      <h2 className="text-xl font-semibold mb-2">My Properties</h2>
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        {userProperties.map(p => (
          <PropertyCard
            key={p.tokenId}
            property={p}
            web3={web3}
            contract={contract}
            account={account}
            refresh={loadBlockchainData}
            isOwnedByUser
          />
        ))}
      </div>

      {/* Available Properties */}
      <h2 className="text-xl font-semibold mb-2">Available Properties</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {properties.map(p => (
          <PropertyCard
            key={p.tokenId}
            property={p}
            web3={web3}
            contract={contract}
            account={account}
            refresh={loadBlockchainData}
          />
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [web3, setWeb3]               = useState(null);
  const [contract, setContract]       = useState(null);
  const [account, setAccount]         = useState(null);
  const [properties, setProperties]   = useState([]);
  const [userProperties, setUserProperties] = useState([]);
  const [loading, setLoading]         = useState(true);

  const loadBlockchainData = async () => {
    setLoading(true);
    if (!window.ethereum) return;
    const w3 = new Web3(window.ethereum);
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const accts = await w3.eth.getAccounts();
    const ci = new w3.eth.Contract(abi, CONTRACT_ADDRESS);
    const all = await ci.methods.getProperties().call();

    const own = [], avail = [];
    for (let p of all) {
      const id = p.id;
      let owner = await ci.methods.ownerOf(id).call().catch(() => '');
      let meta = {};
      try {
        const uri = p.metadataURI.startsWith('ipfs://')
          ? 'https://ipfs.io/ipfs/' + p.metadataURI.split('ipfs://')[1]
          : p.metadataURI;
        meta = await fetch(uri).then(r => r.json());
      } catch {}
      const enriched = { ...p, tokenId: id, owner, ...meta };
      owner.toLowerCase() === accts[0].toLowerCase()
        ? own.push(enriched)
        : avail.push(enriched);
    }

    setWeb3(w3);
    setContract(ci);
    setAccount(accts[0]);
    setUserProperties(own);
    setProperties(avail);
    setLoading(false);
  };

  useEffect(() => {
    loadBlockchainData();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading…</div>;
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <Home
              web3={web3}
              contract={contract}
              account={account}
              properties={properties}
              userProperties={userProperties}
              loadBlockchainData={loadBlockchainData}
            />
          }
        />
        <Route
          path="/listing/:tokenId"
          element={<ListingDetail web3={web3} contract={contract} />}
        />
      </Routes>
    </Router>
  );
}
