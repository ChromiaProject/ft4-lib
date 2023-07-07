import React, { useState, useEffect } from 'react';
import { createClient } from 'postchain-client';
import { createAmount, createKeyStoreInteractor, createWeb3ProviderEvmKeyStore } from 'ft3-lib';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

function App() {
  const [session, setSession] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [assets, setAssets] = useState([]);
  const [receiverId, setReceiverId] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const url = 'http://localhost:7740';
    const rid = '22F97053D106E8A2D6E2C633347CC3A0D4171003DDB3D69E53DEF79D0B9630C7';

    const initializeSession = async () => {
      const client = await createClient({
        nodeURLPool: url,
        blockchainRID: rid,
      });

      const store = await createWeb3ProviderEvmKeyStore(window.ethereum);
      const { getAccounts, getLoginManager } = createKeyStoreInteractor(client, store);

      const accountsData = await getAccounts();
      setAccounts(accountsData);

      if (!accountsData.length) {
        console.log("No accounts found");
        return;
      }

      const newSession = await getLoginManager().login({
        accountId: accountsData[0].id,
      });

      setSession(newSession);
    };

    initializeSession();
  }, []);

  useEffect(() => {
    const getAssets = async () => {
      if (session) {
        const assetsData = await session.getAllAssets();
        setAssets(assetsData);

        if (!assetsData.length) {
          console.log("No assets found");
        }
      }
    };

    getAssets();
  }, [session]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTransfer = async () => {
    await session.account.transfer(receiverId, assets[0].id, createAmount(12, 6));
  };

return (
  <Box
    className="App"
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    style={{ minHeight: '100vh', textAlign: 'center' }}
  >
    <Typography variant="h3" gutterBottom>
      FT4 Demo App
    </Typography>
    {accounts.length ? (
      accounts.map((account, index) => (
        <Typography key={index} variant="h5" component="div" gutterBottom>
          <div>Account</div>
          <div
            style={{ cursor: 'pointer', textDecoration: 'underline' }}
            title="Click to copy"
            onClick={() => handleCopy(account.id)}
          >
            <strong>{account.id.slice(0, 6)}...{account.id.slice(-6)}</strong>
          </div>

    {copied && <div style={{ color: 'green' }}>Copied!</div>}
        </Typography>
      ))
    ) : (
      <Typography>No accounts found</Typography>
    )}
    {assets.length ? (
      assets.map((asset, index) => (
        <Typography key={index} variant="h5" component="div" gutterBottom style={{ marginTop: '1rem' }}>
          <div>Asset</div>
          <div><strong>{asset.name}</strong></div>
          <img src={asset.icon_url} alt={asset.name} style={{ height: '50px' }} />
        </Typography>
      ))
    ) : (
      <Typography>No assets found</Typography>
    )}
    <Box sx={{ margin: '1rem 0' }}>
      <TextField
        label="Receiver ID"
        variant="outlined"
        onChange={e => setReceiverId(e.target.value)}
        sx={{ marginBottom: '1rem', width: '300px' }}
      />
    </Box>
    <Box>
      <Button
        variant="contained"
        onClick={handleTransfer}
        disabled={!receiverId}
        sx={{ fontSize: '1.2rem', padding: '0.8rem 1.6rem' }}
      >
        Transfer
      </Button>
    </Box>
  </Box>
);

}

export default App;
