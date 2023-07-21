import { Account, FlagsType, KeyStore, authDescriptor, createKeyStoreInteractor } from "@chromia/ft4"
import { createClient, encryption, newSignatureProvider } from "postchain-client"
import { createGenericEvmKeyStore } from "../../../dist/client/lib/ft4/authentication"
import { registerAccount } from "../../../dist/client/lib/ft4/admin/admin-op-functions"
import { Address, signMessage, watchAccount } from "@wagmi/core"
import { EthereumClient, w3mConnectors, w3mProvider } from '@web3modal/ethereum'
import { Web3Modal } from '@web3modal/html'
import { configureChains, createConfig } from '@wagmi/core'
import { arbitrum, mainnet, polygon } from '@wagmi/core/chains'

const projectId = '7a27a19adcb9a590e19013d28780325b'
const chains = [arbitrum, mainnet, polygon]

const { publicClient } = configureChains(chains, [w3mProvider({ projectId })])
const wagmiConfig = createConfig({
  autoConnect: true,
  connectors: w3mConnectors({ projectId, chains }),
  publicClient
})
const ethereumClient = new EthereumClient(wagmiConfig, chains)
const web3modal = new Web3Modal({ projectId }, ethereumClient)

async function toHtml(account: Account) {
    const balances = await account.getBalances()
    const wrapper = document.createElement("div")
    wrapper.classList.add("account")

    const accountId = document.createElement("p")
    accountId.innerHTML = `<p><b>Id: </b>${account.id.toString("hex")}</p>`
    wrapper.appendChild(accountId)
      
    const assetList = document.createElement("ul")

    // it will only show up to 100, but it's just a demo
    balances.data.forEach(balance => {
      const item = document.createElement("li")
      item.innerHTML = `${balance.asset.name}: ${balance.amount}`
      assetList.appendChild(item)
    })
    wrapper.appendChild(assetList)
    return wrapper
}

document.getElementById("authentication-button")?.addEventListener("click", onClick)
const client = await createClient({
  nodeURLPool: "http://localhost:7741",
  blockchainIID: 0
});


async function onClick(e: Event) {
  e.preventDefault();
  await web3modal.openModal()
  watchAccount(login)
}

async function login(account: { address: Address }) {
  if (!account.address) {
    const wrapper = document.getElementById("account-id-container")
    wrapper.innerHTML = "No account registered"
    return
  }
  // Create a keystore for holding the evm key
  const evmKeyStore: KeyStore = await createGenericEvmKeyStore({
    address: account.address,
    signMessage: (msg) => signMessage({message: msg})
  });
  
  // Wrap the keystore in an interactor, to be able to fetch accounts
  const { getAccounts } = createKeyStoreInteractor(client, evmKeyStore);
  let accounts = await getAccounts();
  
  // If we do not already have an account
  if (accounts.length === 0) {
    // Create an auth descriptor which is allowed to administrate the account
    const descriptor = authDescriptor.create.singleSig.withArgs(
      [FlagsType.Account],
      evmKeyStore.id,
    ).andNoRules;
  
    // Create an account using the auth descriptor
    // Note: Here we are using the admin based creation methods,
    // which in prod would allow people to spam your chain.
    await registerAccount(
      client,
      newSignatureProvider(
        encryption.makeKeyPair(
          "00CED79962D1150BF844CACB76310D4746C4426558A7FD9C827B30203DACC4CE"
        )
      ),
      descriptor
    );

    // Fetch all accounts again, to get the newly created account
    accounts = await getAccounts();
  }
  
  const views = await Promise.all(accounts.map(toHtml));
  const wrapper = document.getElementById("account-id-container")
  if (wrapper) {
    wrapper.innerHTML = ""
    views.forEach(view => wrapper.appendChild(view))
  }
}


