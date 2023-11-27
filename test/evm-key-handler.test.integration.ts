import { IClient, encryption } from "postchain-client";
import { authDescriptor } from "/ft4/accounts/auth-descriptor";
import { createInMemoryEvmKeyStore } from "/ft4/authentication/evm/key-stores/in-memory";
import { createKeyStoreInteractor } from "/ft4/ft-session";
import { createAccount } from "./util/util";
import { createChromiaClient } from "./util/blockchain-util";

describe("EVM key handler", () => {
  let client: IClient;

  beforeAll(async () => {
    client = await createChromiaClient();
  });

  it("should add FT auth descriptor", async () => {
    const keyPair = encryption.makeKeyPair();
    const keyStore = createInMemoryEvmKeyStore(keyPair);
    const ad = authDescriptor.create.singleSig.withArgs(
      ["A"],
      keyStore.address,
    ).andNoRules;
    await createAccount(client, ad);

    const session = await createKeyStoreInteractor(client, keyStore).getSession(
      ad.id,
    );

    const keyPair2 = encryption.makeKeyPair();
    const ad2 = authDescriptor.create.singleSig.withArgs(
      ["T"],
      keyPair2.pubKey,
    ).andNoRules;
    await session.account.addAuthDescriptor(ad2, keyPair2);

    const authDescriptors = await session.account.getAuthDescriptors();
    expect(authDescriptors.data.length).toEqual(2);
  });
});
