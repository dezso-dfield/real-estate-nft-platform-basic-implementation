import { useEffect, useState } from "react";
import Web3 from "web3";
import abi from "./abi/RealEstate.json";
import PropertyCard from "./components/PropertyCard"; // Ensure this path is correct

// IMPORTANT: Update this CONTRACT_ADDRESS every time you redeploy your contract!
// You can get the new address from your Hardhat deployment output.
const CONTRACT_ADDRESS = "0x0165878A594ca255338adfa4d48449f69242Eb8F"; // Placeholder: REPLACE WITH YOUR DEPLOYED CONTRACT ADDRESS

function App() {
    const [web3, setWeb3] = useState(null);
    const [contract, setContract] = useState(null);
    const [account, setAccount] = useState(null);
    const [properties, setProperties] = useState([]);
    const [userProperties, setUserProperties] = useState([]); // New state for properties owned by the current user
    const [isOwner, setIsOwner] = useState(false); // Still useful for other owner-specific features if any
    const [loading, setLoading] = useState(true); // Added loading state

    const [priceInput, setPriceInput] = useState("");
    const [locationInput, setLocationInput] = useState("");
    const [tokenURIInput, setTokenURIInput] = useState("");

    // Function to load and refresh blockchain data
    const loadBlockchainData = async () => {
        setLoading(true);
        if (window.ethereum) {
            try {
                const web3Instance = new Web3(window.ethereum);
                await window.ethereum.request({ method: "eth_requestAccounts" });

                const accounts = await web3Instance.eth.getAccounts();
                const contractInstance = new web3Instance.eth.Contract(abi, CONTRACT_ADDRESS);

                const ownerStatus = await contractInstance.methods.isPlatformOwner(accounts[0]).call();
                const allProperties = await contractInstance.methods.getProperties().call();

                // Filter properties owned by the current account
                const ownedProps = [];
                const availableProps = [];

                for (let i = 0; i < allProperties.length; i++) {
                    const prop = allProperties[i];
                    let tokenOwner = "N/A"; // Default value if ownerOf fails or property not minted yet
                    try {
                        tokenOwner = await contractInstance.methods.ownerOf(i).call();
                        if (tokenOwner.toLowerCase() === accounts[0].toLowerCase()) {
                            ownedProps.push({ ...prop, tokenId: i, owner: tokenOwner });
                        } else {
                            availableProps.push({ ...prop, tokenId: i, owner: tokenOwner });
                        }
                    } catch (error) {
                        // If ownerOf fails (e.g., token not yet minted or invalid ID), treat as available
                        console.warn(`Could not get owner for token ID ${i}:`, error.message);
                        availableProps.push({ ...prop, tokenId: i, owner: tokenOwner }); // Still add N/A owner
                    }
                }

                setWeb3(web3Instance);
                setContract(contractInstance);
                setAccount(accounts[0]);
                setIsOwner(ownerStatus);
                setProperties(availableProps); // Properties available for purchase
                setUserProperties(ownedProps); // Properties owned by the current user

            } catch (error) {
                console.error("Error loading blockchain data:", error);
                alert("Failed to load blockchain data. Please check console for details.");
            } finally {
                setLoading(false);
            }
        } else {
            console.error("MetaMask not detected. Please install MetaMask.");
            alert("Please install MetaMask to use this DApp.");
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBlockchainData();
    }, []); // Run once on component mount

    const addProperty = async (e) => {
        e.preventDefault();
        if (!web3 || !contract || !account) {
            console.error("Web3, contract, or account not initialized.");
            alert("DApp not fully loaded. Please refresh.");
            return;
        }

        try {
            const weiPrice = web3.utils.toWei(priceInput, "ether");
            
            await contract.methods
                .addProperty(weiPrice, locationInput, tokenURIInput)
                .send({ from: account });

            console.log("Property added successfully!");
            setPriceInput("");
            setLocationInput("");
            setTokenURIInput("");
            await loadBlockchainData(); // Refresh properties list
        } catch (error) {
            console.error("Error adding property:", error);
            alert("Transaction failed: " + error.message);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <p className="text-xl text-gray-700">Loading DApp...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6 font-sans text-gray-800">
            <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-md p-8 md:p-12 border border-gray-100">
                <h1 className="text-4xl font-bold mb-6 text-center text-gray-900">
                    Real Estate DApp 🏠
                </h1>
                <p className="mb-8 text-center text-gray-600 text-base">
                    Connected Wallet:{" "}
                    <span className="font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded-sm text-sm break-all">
                        {account}
                    </span>
                </p>

                {/* Form to add new properties */}
                <form onSubmit={addProperty} className="bg-gray-50 p-8 rounded-lg shadow-inner mb-12 border border-gray-200">
                    <h2 className="text-2xl font-semibold mb-6 text-gray-800 text-center">List a New Property</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <input
                            type="number"
                            placeholder="Price in ETH"
                            value={priceInput}
                            onChange={(e) => setPriceInput(e.target.value)}
                            required
                            min="0"
                            step="any"
                            className="border border-gray-300 p-3 rounded-md focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition duration-150 text-gray-700 placeholder-gray-500"
                        />
                        <input
                            type="text"
                            placeholder="Location"
                            value={locationInput}
                            onChange={(e) => setLocationInput(e.target.value)}
                            required
                            className="border border-gray-300 p-3 rounded-md focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition duration-150 text-gray-700 placeholder-gray-500"
                        />
                        <input
                            type="text"
                            placeholder="Token URI (e.g., ipfs://Qm...)"
                            value={tokenURIInput}
                            onChange={(e) => setTokenURIInput(e.target.value)}
                            required
                            className="border border-gray-300 p-3 rounded-md focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition duration-150 text-gray-700 placeholder-gray-500 md:col-span-2"
                        />
                        <button
                            type="submit"
                            className="md:col-span-2 bg-blue-600 text-white px-6 py-3 rounded-md font-semibold text-lg hover:bg-blue-700 transition duration-200 ease-in-out shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        >
                            Add Property
                        </button>
                    </div>
                </form>

                {/* My Properties Section */}
                <h2 className="text-3xl font-semibold mb-8 text-center text-gray-800">My Properties</h2>
                {userProperties.length === 0 ? (
                    <p className="text-center text-gray-600 text-base mb-12 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        You don't own any properties yet.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                        {userProperties.map((p) => (
                            <PropertyCard
                                key={p.tokenId}
                                id={p.tokenId}
                                property={p}
                                web3={web3}
                                contract={contract}
                                account={account}
                                refreshProperties={loadBlockchainData}
                                isOwnedByUser={true}
                            />
                        ))}
                    </div>
                )}

                {/* Available Properties Section */}
                <h2 className="text-3xl font-semibold mb-8 text-center text-gray-800">Properties For Sale</h2>
                {properties.length === 0 ? (
                    <p className="text-center text-gray-600 text-base p-4 bg-gray-50 rounded-lg border border-gray-200">
                        No properties are currently available for sale.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {properties.map((p) => (
                            <PropertyCard
                                key={p.tokenId}
                                id={p.tokenId}
                                property={p}
                                web3={web3}
                                contract={contract}
                                account={account}
                                refreshProperties={loadBlockchainData}
                                isOwnedByUser={false}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
