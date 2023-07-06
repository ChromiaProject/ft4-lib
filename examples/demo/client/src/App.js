import logo from './logo.svg';
import './App.css';
import { useEffect } from 'react';
import { gtxClient, restClient, restClientutil } from 'postchain-client';
import { createAmount, createKeyStoreInteractor, createWeb3ProviderEvmKeyStore } from 'ft3-lib';

function App() {
  useEffect(() => {
    const url = "http://localhost:7740";
    restClientutil.getBrid(url, 0)
    .then((brid) => gtxClient.createClient(
      restClient.createRestClient([url], brid),
      brid,
      []
    ))
    .then((client) => {
      createWeb3ProviderEvmKeyStore(window.ethereum).then(async store => {
        const { getAccounts, getSession } = createKeyStoreInteractor(client, store); 
  
        const accounts = await getAccounts()
  
        if (!accounts.length) return;
  
        const session = await getSession(accounts[0].id);
        // const session = await getLoginManager().login({
        //   accountId: accounts[0].id,
        //   flags: ["T"]
        // })
  
        const assets = await session.getAllAssets();
  
        await session.account.transfer("7CF257C529995C67CD3AB603E015DEBEBA69A2EE005312A77CD661A590CA4871", assets[0].id, createAmount(12, 6))
        // await session.call(op("foo"))
        // await session.call(op("bar", "some test", 54321));
        // await session.call(op("foo"), op("bar", "some test", 54321))
      });
    })
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
