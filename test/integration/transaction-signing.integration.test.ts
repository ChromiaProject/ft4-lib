import {
  adminUser,
  createTestAuthDescriptor,
  createTestAuthDescriptorWithSigner,
  testAdFromRegistration,
  useChromiaNode,
} from "@ft4-test/util";
import { AuthFlag } from "@ft4/accounts";
import { addRateLimitPoints, registerAccountAdmin } from "@ft4/admin";
import {
  AuthDataService,
  createAuthenticator,
  createEvmKeyHandler,
  createFtKeyHandler,
  createInMemoryEvmKeyStore,
  createInMemoryFtKeyStore,
} from "@ft4/authentication";
import {
  Connection,
  createAuthDataService,
  createConnection,
} from "@ft4/ft-session";
import { signTransaction, transactionBuilder } from "@ft4/transaction-builder";
import { op } from "@ft4/utils";
import { IClient, encryption, gtv, gtx } from "postchain-client";

describe("Transaction Signing", () => {
  let _connection: Connection;
  let client: IClient;
  const getClient = useChromiaNode();

  let authDataService: AuthDataService;

  beforeAll(() => {
    client = getClient();
    _connection = createConnection(client);
    authDataService = createAuthDataService(_connection);
  });

  it("correctly signs a transaction with GTX signatures", async () => {
    const { keyPair, authDescriptor: ad } = createTestAuthDescriptor([
      AuthFlag.Account,
    ]);
    await registerAccountAdmin(client, adminUser().signatureProvider, ad);

    const keyStore = createInMemoryFtKeyStore(keyPair);
    const authenticator = createAuthenticator(
      ad.id,
      [createFtKeyHandler(testAdFromRegistration(ad), keyStore)],
      authDataService,
    );

    const tx = await transactionBuilder(authenticator, client)
      .add(op("test_authenticated_operation"))
      .build();

    const receipt = await client.sendTransaction(
      await signTransaction(_connection, authenticator, gtx.deserialize(tx)),
    );
    expect(receipt.status).toBe("confirmed");
  });

  it("correctly signs a transaction with evm signatures", async () => {
    const keyPair = encryption.makeKeyPair();
    const keyStore = createInMemoryEvmKeyStore(keyPair);
    const ad = createTestAuthDescriptorWithSigner(
      gtv.gtvHash(keyPair.pubKey),
      keyStore.id,
      [...Object.values(AuthFlag)],
      null,
    );

    const accountId = ad.id;
    await registerAccountAdmin(client, adminUser().signatureProvider, ad);
    await addRateLimitPoints(
      client,
      adminUser().signatureProvider,
      accountId,
      100,
    );

    const authenticator = createAuthenticator(
      accountId,
      [createEvmKeyHandler(testAdFromRegistration(ad), keyStore)],
      authDataService,
    );

    const tx = await transactionBuilder(authenticator, client)
      .add(op("test_authenticated_operation"))
      .build();

    const receipt = await client.sendTransaction(
      await signTransaction(_connection, authenticator, gtx.deserialize(tx)),
    );
    expect(receipt.status).toBe("confirmed");
  });

  it("correctly signs a transaction with both gtx and evm signatures", async () => {
    const keyPair = encryption.makeKeyPair();
    const evmKeyStore = createInMemoryEvmKeyStore(keyPair);
    const ftKeyStore = createInMemoryFtKeyStore(keyPair);
    const ad1 = createTestAuthDescriptorWithSigner(
      gtv.gtvHash(keyPair.pubKey),
      evmKeyStore.id,
      [...Object.values(AuthFlag)],
      null,
    );
    const ad2 = createTestAuthDescriptorWithSigner(
      gtv.gtvHash(keyPair.pubKey),
      ftKeyStore.id,
      [...Object.values(AuthFlag)],
      null,
    );

    const accountId1 = ad1.id;
    const accountId2 = ad2.id;

    await registerAccountAdmin(client, adminUser().signatureProvider, ad1);
    await addRateLimitPoints(
      client,
      adminUser().signatureProvider,
      accountId1,
      100,
    );
    await registerAccountAdmin(client, adminUser().signatureProvider, ad2);
    await addRateLimitPoints(
      client,
      adminUser().signatureProvider,
      accountId2,
      100,
    );

    const evmAuthenticator = createAuthenticator(
      accountId1,
      [createEvmKeyHandler(testAdFromRegistration(ad1), evmKeyStore)],
      authDataService,
    );

    const ftAuthenticator = createAuthenticator(
      accountId2,
      [createFtKeyHandler(testAdFromRegistration(ad2), ftKeyStore)],
      authDataService,
    );

    const tx = await transactionBuilder(evmAuthenticator, client)
      .add(op("test_authenticated_operation"), {
        authenticator: evmAuthenticator,
      })
      .add(op("test_authenticated_operation"))
      .build();

    const ftSignedTx = await signTransaction(
      _connection,
      ftAuthenticator,
      gtx.deserialize(tx),
    );

    const receipt = await client.sendTransaction(ftSignedTx);
    expect(receipt.status).toBe("confirmed");
  });
});
