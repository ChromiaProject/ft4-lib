import React, { useState, useEffect } from 'react';
import { createClient } from 'postchain-client';
import { createAmount, createKeyStoreInteractor, createWeb3ProviderEvmKeyStore } from 'ft3-lib';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';

function App() {
  const [session, setSession] = useState(null); // define session state
  const [accounts, setAccounts] = useState([]);
  const [assets, setAssets] = useState([]);
  const [receiverId, setReceiverId] = useState('');

  useEffect(() => {
    const url = 'http://localhost:7740';
    const rid = '22F97053D106E8A2D6E2C633347CC3A0D4171003DDB3D69E53DEF79D0B9630C7';

    createClient({
        nodeURLPool: url,
        blockchainRID: rid,
    })
    .then((client) => {
      createWeb3ProviderEvmKeyStore(window.ethereum).then(async store => {
        const { getAccounts, getLoginManager } = createKeyStoreInteractor(client, store); 
  
        const accountsData = await getAccounts();
        setAccounts(accountsData);
  
        if (!accountsData.length) {
            console.log("No accounts found");
            return;
        }

        const newSession = await getLoginManager().login({
            accountId: accountsData[0].id,
        })
        setSession(newSession);

        const assetsData = await session.getAllAssets();
        setAssets(assetsData);

        if (!assetsData.length) {
          console.log("No assets found");
        }
      });
    })
  });

  const handleTransfer = async () => {
    await session.account.transfer(receiverId, assets[0].id, createAmount(12, 6));
  };

  return (
    <div className="App">
      <div>
        {accounts.length ? accounts.map((account, index) => (
          <p key={index}>Account: {account.id}</p>
        )) : <p>No accounts found</p>}
      </div>
      <div>
        {assets.length ? assets.map((asset, index) => (
          <div key={index}>
            <img src={asset.icon_url} alt={asset.name} />
            <p>{asset.name}</p>
          </div>
        )) : <p>No assets found</p>}
      </div>
      <div>
        <TextField label="Receiver ID" variant="outlined" onChange={e => setReceiverId(e.target.value)} />
        <Button variant="contained" onClick={handleTransfer}>Transfer</Button>
      </div>
    </div>
  );
}

export default App;
