# Real Esate Smart Contract via NFT

This project matches buyers and real esate sellers that can be verified via proof of ownership NFTs that transfers with purchases too.

```shell
npx hardhat compile
npx hardhat test

npx hardhat node
npx hardhat ignition deploy ./ignition/modules/RealEstate.js --network localhost
```
For funding contracts on the local network:
```shell
npx hardhat run scripts/fund-contract.js --network localhost
```

Start the backend:
```shell
node server.js
```

Start the frontend:
```shell
npm run dev
```

Ensure MetaMask and enjoy it is still basic will be updated later
