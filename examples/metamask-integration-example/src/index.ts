import { 
  Account,
  FlagsType,
  KeyStore,
  authDescriptor,
  createKeyStoreInteractor,
  createWeb3ProviderEvmKeyStore 
} from "@chromia/ft4";
import { createClient, encryption, newSignatureProvider } from "postchain-client";
import { registerAccount } from "../../../dist/client/lib/ft4/admin/admin-op-functions"

declare global {
  interface Window { ethereum: any }
}

async function createChromiaClient(nodeUrl?: string) {
  const url = nodeUrl || "http://localhost:7741";
  return createClient({
    nodeURLPool: url,
    blockchainIID: 0
  });
}

async function toHtml(account: Account) {
    const balances = await account.getBalances()
    const wrapper = document.createElement("div")
    wrapper.classList.add("account")

    const accountId = document.createElement("p")
    accountId.innerHTML = `<p><b>Id: </b>${account.id.toString("hex")}</p>`
    wrapper.appendChild(accountId)
      
    const assetList = document.createElement("ul")
    balances.data.forEach(balance => {
      const item = document.createElement("li")
      item.innerHTML = `${balance.asset.name}: ${balance.amount}`
      assetList.appendChild(item)
    })
    wrapper.appendChild(assetList)
    return wrapper
}

document.getElementById("authentication-button")?.addEventListener("click", onClick)
const client = await createChromiaClient();


async function onClick(e: Event) {
  e.preventDefault();

  // Create a keystore for holding the evm key
  const evmKeyStore: KeyStore = await createWeb3ProviderEvmKeyStore(window.ethereum);
  
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
    // Note: Here we are using the dev method of creating an account, in a production system
    // you will want to use one of the admin based creation methods, or create your own
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


