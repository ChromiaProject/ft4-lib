import {
  createAccount,
  getAccountIdFromAuthDescriptor,
  useChromiaNode,
} from "@ft4-test/util";
import { createSingleSigAuthDescriptorRegistration } from "@ft4/accounts";
import {
  createInMemoryEvmKeyStore,
  createInMemoryFtKeyStore,
} from "@ft4/authentication";
import { createKeyStoreInteractor } from "@ft4/ft-session";
import { IClient, encryption } from "postchain-client";

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
      ["A", "T"],
      keyStore.address,
      null,
    );
    await createAccount(client, ad);

    const session = await createKeyStoreInteractor(client, keyStore).getSession(
      getAccountIdFromAuthDescriptor(ad),
    );

    const keyPair2 = encryption.makeKeyPair();
    const ad2 = createSingleSigAuthDescriptorRegistration(
      ["T"],
      keyPair2.pubKey,
      null,
    );
    await session.account.addAuthDescriptor(
      ad2,
      createInMemoryFtKeyStore(keyPair2),
    );

    const authDescriptors = await session.account.getAuthDescriptors();
    expect(authDescriptors.length).toEqual(2);
  });
});
