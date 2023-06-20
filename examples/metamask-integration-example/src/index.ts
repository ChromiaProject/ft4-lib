import { gtxClient, restClient, restClientutil } from "postchain-client";
import {
  KeyStore,
  FlagsType,
  createWeb3ProviderEVMKeyStore,
  createKeyStoreInteractor,
  AuthDescriptor,
  authDescriptor,
  IAccount,
} from "ft3-lib";
import { GtxClient } from "postchain-client/built/src/gtx/interfaces";

declare global {
  interface Window { ethereum: any }
}

async function createClient(nodeUrl?: string) {
  const url = nodeUrl || "http://localhost:7740";
  const brid = await restClientutil.getBrid(url, 0);
  return gtxClient.createClient(
    restClient.createRestClient([url], brid),
    brid,
    []
  );
}

async function createAccount(client: GtxClient, ad: AuthDescriptor) {
  const tx = client.newTransaction([]);
  tx.addOperation("ft4.register_account_test", authDescriptor.toGtv(ad) as any);
  await tx.postAndWaitConfirmation();
}

async function toHtml(account: IAccount) {
    const balances = await account.getBalances()
    const wrapper = document.createElement("div")
    wrapper.classList.add("account")

    const accountId = document.createElement("p")
    accountId.innerHTML = `<p><b>Id: </b>${account.id.toString("hex")}</p>`
    wrapper.appendChild(accountId)
      
    const assetList = document.createElement("ul")
    balances.forEach(balance => {
      const item = document.createElement("li")
      item.innerHTML = `${balance.asset.name}: ${balance.amount}`
      assetList.appendChild(item)
    })
    wrapper.appendChild(assetList)
    return wrapper
}

document.getElementById("authentication-button")?.addEventListener("click", onClick)
const client = await createClient();


async function onClick(e: Event) {
  e.preventDefault();

  // Create a keystore for holding the evm key
  const evmKeyStore: KeyStore = await createWeb3ProviderEVMKeyStore(window.ethereum);
  
  // Wrap the keystore in an interactor, to be able to fetch accounts
  const { getAccounts } = createKeyStoreInteractor(client, evmKeyStore);
  let accounts = await getAccounts();
  
  // If we do not already have an account
  if (accounts.length === 0) {
    // Create an auth descriptor which is allowed to administrate the account
    const descriptor = authDescriptor.create.singleSigEvm.withArgs(
      [FlagsType.Account],
      evmKeyStore.id,
    ).andNoRules;
  
    // Create an account using the auth descriptor
    // Note: Here we are using the dev method of creating an account, in a production system
    // you will want to use one of the admin based creation methods, or create your own
    await createAccount(client, descriptor);

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


