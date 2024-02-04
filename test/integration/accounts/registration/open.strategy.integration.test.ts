import { registerAccount } from "@ft4/accounts/registration";
import { open } from "@ft4/accounts/registration/strategies/open";
import {
  Connection,
  createConnection,
  createInMemoryEvmKeyStore,
  createInMemoryFtKeyStore,
  createSingleSigAuthDescriptorRegistration,
} from "@ft4/index";
import { useChromiaNode } from "@ft4/util/chromia-node";
import { encryption, gtv } from "postchain-client";

let _connection: Connection;

describe("Test open strategy", () => {
  const getClient = useChromiaNode();

  beforeAll(async () => {
    const client = getClient();
    _connection = createConnection(client);
  });

  it("can register account", async () => {
    const keyPair = encryption.makeKeyPair();
    const keyStore = createInMemoryFtKeyStore(keyPair);

    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      ["A", "T"],
      keyStore.id,
    );

    const session = await registerAccount(
      _connection,
      keyStore,
      open(authDescriptor),
    );

    expect(session.account.id).toEqual(gtv.gtvHash(keyPair.pubKey));
  });

  it("can add disposable key during account registration", async () => {
    const keyPair = encryption.makeKeyPair();
    const keyStore = createInMemoryFtKeyStore(keyPair);

    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      ["A", "T"],
      keyStore.id,
    );

    const session = await registerAccount(
      _connection,
      keyStore,
      open(authDescriptor, { config: { flags: [] } }),
    );

    expect(session.account.id).toEqual(gtv.gtvHash(keyPair.pubKey));
  });

  it("can register account with evm key store", async () => {
    const keyPair = encryption.makeKeyPair();
    const keyStore = createInMemoryEvmKeyStore(keyPair);

    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      ["A", "T"],
      keyStore.id,
    );

    const session = await registerAccount(
      _connection,
      keyStore,
      open(authDescriptor),
    );

    expect(session.account.id).toEqual(gtv.gtvHash(keyStore.address));
  });

  it("can register account with evm key store and add disposable key", async () => {
    const keyPair = encryption.makeKeyPair();
    const keyStore = createInMemoryEvmKeyStore(keyPair);

    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      ["A", "T"],
      keyStore.id,
    );

    const session = await registerAccount(
      _connection,
      keyStore,
      open(authDescriptor, { config: { flags: [] } }),
    );

    expect(session.account.id).toEqual(gtv.gtvHash(keyStore.address));
  });
});
