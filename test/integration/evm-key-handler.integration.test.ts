import { IClient, encryption } from "postchain-client";
import { createInMemoryEvmKeyStore } from "@ft4/authentication/evm/key-stores/in-memory";
import { createKeyStoreInteractor } from "@ft4/ft-session";
import { createAccount } from "@ft4/util/util";
import {
  createSingleSigAuthDescriptorRegistration,
  deriveAuthDescriptorId,
} from "@ft4/accounts/auth-descriptor";
import { useChromiaNode } from "@ft4/util/chromia-node";

describe("EVM key handler", () => {
  let client: IClient;

  const getClient = useChromiaNode();

  beforeAll(async () => {
    client = getClient();
  });

  it("should add FT auth descriptor", async () => {
    const keyPair = encryption.makeKeyPair();
    const keyStore = createInMemoryEvmKeyStore(keyPair);
    const ad = createSingleSigAuthDescriptorRegistration(
      ["A"],
      keyStore.address,
      null,
    );
    await createAccount(client, ad);

    const session = await createKeyStoreInteractor(client, keyStore).getSession(
      deriveAuthDescriptorId(ad),
    );

    const keyPair2 = encryption.makeKeyPair();
    const ad2 = createSingleSigAuthDescriptorRegistration(
      ["T"],
      keyPair2.pubKey,
      null,
    );
    await session.account.addAuthDescriptor(ad2, keyPair2);

    const authDescriptors = await session.account.getAuthDescriptors();
    expect(authDescriptors.length).toEqual(2);
  });
});
