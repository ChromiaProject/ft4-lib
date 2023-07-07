import React, { useState, useEffect } from 'react';
import { Buffer } from 'buffer';
import { createClient } from 'postchain-client';
import {
    createAmount,
    createKeyStoreInteractor,
    createWeb3ProviderEvmKeyStore,
    createSessionStorageLoginKeyStore,
} from 'ft3-lib';

import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

const useSession = () => {
  const [session, setSession] = useState(null);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        const url = 'http://localhost:7740';
        const rid = '22F97053D106E8A2D6E2C633347CC3A0D4171003DDB3D69E53DEF79D0B9630C7';

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

        const newSession = await getLoginManager(createSessionStorageLoginKeyStore()).login({
          accountId: accountsData[0].id,
        });

        setSession(newSession);
      } catch (error) {
        console.error("Failed to initialize session:", error);
      }
    };

    initializeSession();
  }, []);

  return { session, accounts };
};

function App() {
  const { session, accounts } = useSession();
  const [assets, setAssets] = useState([]);
  const [receiverId, setReceiverId] = useState('');
  const [copied, setCopied] = useState(false);
  const [transferMsg, setTransferMsg] = useState({ success: false, message: '' });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const getAssets = async () => {
      if (session) {
        const assetsResult = await session.getAllAssets();
        const assetsData = assetsResult?.data;

        if (assetsData?.length) {
          setAssets(assetsData);
        } else {
          console.log("No assets found");
        }
      }
    };

    getAssets();
  }, [session]);

  const handleCopy = (hexId) => {
    navigator.clipboard.writeText(hexId);
    setCopied(true);
  };

  const handleTransfer = async () => {
    try {
      await session.account.transfer(receiverId, assets[0].id, createAmount(12, 6));
      setTransferMsg({ success: true, message: "Transfer successful!" });
    } catch (error) {
      setTransferMsg({ success: false, message: "Transfer failed!" });
    } finally {
      setOpen(true);
    }
  };

  const handleClose = (_, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
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
        accounts.map((account, index) => { 
          const hexId = Buffer.from(account.id).toString('hex');

          return (
            <Typography key={index} variant="h5" component="div" gutterBottom>
              <div>Account</div>

              <div
                style={{ cursor: 'pointer', textDecoration: 'underline' }}
                title="Click to copy"
                onClick={() => handleCopy(hexId)}
              >
                <strong>{hexId.slice(0, 20)}&hellip;{hexId.slice(-20)}</strong>
              </div>

              {copied && (
                <Snackbar open={copied} autoHideDuration={2000} onClose={() => setCopied(false)}>
                <Alert onClose={() => setCopied(false)} severity="success" sx={{ width: '100%' }}>
                Copied!
                </Alert>
                </Snackbar>
              )}
            </Typography>
          );
        })
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
        disabled={!receiverId || !assets.length}
        sx={{ fontSize: '1.2rem', padding: '0.8rem 1.6rem' }}
      >
        Transfer
      </Button>
      <Snackbar open={open} autoHideDuration={6000} onClose={handleClose}>
        <Alert onClose={handleClose} severity={transferMsg.success ? "success" : "error"} sx={{ width: '100%' }}>
          {transferMsg.message}
        </Alert>
      </Snackbar>

    </Box>
  </Box>
);

}

export default App;
