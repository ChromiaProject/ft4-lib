import {
  adminUser,
  createTestAuthDescriptor,
  createTestAuthDescriptorWithSigner,
  getAccountIdFromAuthDescriptor,
  testAdFromRegistration,
  useChromiaNode,
} from "@ft4-test/util";
import {
  AuthFlag,
  addAuthDescriptor,
  createMultiSigAuthDescriptorRegistration,
  createSingleSigAuthDescriptorRegistration,
} from "@ft4/accounts";
import { registerAccountAdmin } from "@ft4/admin";
import {
  AuthDataService,
  createAuthenticator,
  createEvmKeyHandler,
  createFtKeyHandler,
  createInMemoryEvmKeyStore,
  createInMemoryFtKeyStore,
  evmSigner,
  ftSigner,
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
  let connection: Connection;
  let client: IClient;
  const getClient = useChromiaNode();

  let authDataService: AuthDataService;

  beforeAll(() => {
    client = getClient();
    connection = createConnection(client);
    authDataService = createAuthDataService(connection);
  });

  it("correctly signs a transaction with GTX signatures", async () => {
    const { keyPair, authDescriptor: ad } = createTestAuthDescriptor([
      AuthFlag.Account,
      AuthFlag.Transfer,
    ]);
    await registerAccountAdmin(client, adminUser().signatureProvider, ad);

    const keyStore = createInMemoryFtKeyStore(keyPair);
    const authenticator = createAuthenticator(
      getAccountIdFromAuthDescriptor(ad),
      [createFtKeyHandler(testAdFromRegistration(ad), keyStore)],
      authDataService,
    );

    const tx = await transactionBuilder(authenticator, client)
      .add(op("test_authenticated_operation"))
      .build();

    const receipt = await client.sendTransaction(
      await signTransaction(connection, authenticator, gtx.deserialize(tx)),
    );
    expect(receipt.status).toBe("confirmed");
  });

  it("correctly signs a transaction with evm signatures", async () => {
    const keyPair = encryption.makeKeyPair();
    const keyStore = createInMemoryEvmKeyStore(keyPair);
    const accountId = gtv.gtvHash(keyStore.id);

    const ad = createTestAuthDescriptorWithSigner(
      accountId,
      keyStore.id,
      [...Object.values(AuthFlag)],
      null,
    );

    await registerAccountAdmin(client, adminUser().signatureProvider, ad);

    const authenticator = createAuthenticator(
      accountId,
      [createEvmKeyHandler(testAdFromRegistration(ad), keyStore)],
      authDataService,
    );

    const tx = await transactionBuilder(authenticator, client)
      .add(op("test_authenticated_operation"))
      .build();

    const receipt = await client.sendTransaction(
      await signTransaction(connection, authenticator, gtx.deserialize(tx)),
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

    const accountId1 = getAccountIdFromAuthDescriptor(ad1);
    const accountId2 = getAccountIdFromAuthDescriptor(ad2);

    await registerAccountAdmin(client, adminUser().signatureProvider, ad1);
    await registerAccountAdmin(client, adminUser().signatureProvider, ad2);

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
      connection,
      ftAuthenticator,
      gtx.deserialize(tx),
    );

    const receipt = await client.sendTransaction(ftSignedTx);
    expect(receipt.status).toBe("confirmed");
  });

  it("correctly signs an evm multisig operation", async () => {
    const keyPair1 = encryption.makeKeyPair();
    const keyPair2 = encryption.makeKeyPair();
    const keyPair3 = encryption.makeKeyPair();

    const evmKeyStore1 = createInMemoryEvmKeyStore(keyPair1);
    const evmKeyStore2 = createInMemoryEvmKeyStore(keyPair2);
    const ftKeyStore = createInMemoryFtKeyStore(keyPair3);

    const originalAd = createMultiSigAuthDescriptorRegistration(
      [...Object.values(AuthFlag)],
      [evmKeyStore1.id, evmKeyStore2.id],
      2,
      null,
    );

    const accountId = getAccountIdFromAuthDescriptor(originalAd);

    await registerAccountAdmin(
      client,
      adminUser().signatureProvider,
      originalAd,
    );

    const adToAdd = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Transfer],
      ftKeyStore.id,
    );

    const authDataService = createAuthDataService(connection);
    const authenticator1 = createAuthenticator(
      accountId,
      [createEvmKeyHandler(testAdFromRegistration(originalAd), evmKeyStore1)],
      authDataService,
    );

    const authenticator2 = createAuthenticator(
      accountId,
      [
        createEvmKeyHandler(testAdFromRegistration(originalAd), evmKeyStore2),
        createFtKeyHandler(testAdFromRegistration(adToAdd), ftKeyStore),
      ],
      authDataService,
    );

    const partiallySignedTx = await transactionBuilder(authenticator1, client)
      .add(addAuthDescriptor(adToAdd), { signers: [ftSigner(ftKeyStore.id)] })
      .build();
    const evmSignedTx = await signTransaction(
      connection,
      authenticator2,
      partiallySignedTx,
    );

    const receipt = await client.sendTransaction(evmSignedTx);
    expect(receipt.status).toBe("confirmed");
  });

  it("Fails if some signatures is missing from main ad", async () => {
    const keyPair1 = encryption.makeKeyPair();
    const keyPair2 = encryption.makeKeyPair();
    const keyPair3 = encryption.makeKeyPair();

    const evmKeyStore1 = createInMemoryEvmKeyStore(keyPair1);
    const evmKeyStore2 = createInMemoryEvmKeyStore(keyPair2);
    const ftKeyStore = createInMemoryFtKeyStore(keyPair3);

    const originalAd = createMultiSigAuthDescriptorRegistration(
      [...Object.values(AuthFlag)],
      [evmKeyStore1.id, evmKeyStore2.id],
      2,
      null,
    );

    const accountId = getAccountIdFromAuthDescriptor(originalAd);

    await registerAccountAdmin(
      client,
      adminUser().signatureProvider,
      originalAd,
    );

    const adToAdd = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Transfer],
      ftKeyStore.id,
    );
    const authDataService = createAuthDataService(connection);
    const evmAuthenticator = createAuthenticator(
      accountId,
      [createEvmKeyHandler(testAdFromRegistration(originalAd), evmKeyStore1)],
      authDataService,
    );
    const ftAuthenticator = createAuthenticator(
      accountId,
      [createFtKeyHandler(testAdFromRegistration(originalAd), ftKeyStore)],
      authDataService,
    );
    const partiallySignedTx = await transactionBuilder(evmAuthenticator, client)
      .add(addAuthDescriptor(adToAdd), {
        signers: [ftSigner(ftKeyStore.id)],
        skipFtSigning: true,
      })
      .build();

    const signedTx = await signTransaction(
      connection,
      ftAuthenticator,
      partiallySignedTx,
    );
    await expect(client.sendTransaction(signedTx)).rejects.toThrow(
      /failed: Minimum number of valid signatures not reached. Expected <2>, found <1>./,
    );
  });

  it("succeeds if m of n signatures is provided", async () => {
    const keyPair1 = encryption.makeKeyPair();
    const keyPair2 = encryption.makeKeyPair();
    const keyPair3 = encryption.makeKeyPair();
    const keyPair4 = encryption.makeKeyPair();

    const evmKeyStore1 = createInMemoryEvmKeyStore(keyPair1);
    const evmKeyStore2 = createInMemoryEvmKeyStore(keyPair2);
    const evmKeyStore3 = createInMemoryEvmKeyStore(keyPair3);
    const ftKeyStore = createInMemoryFtKeyStore(keyPair4);

    const originalAd = createMultiSigAuthDescriptorRegistration(
      [...Object.values(AuthFlag)],
      [evmKeyStore1.id, evmKeyStore2.id, evmKeyStore3.id],
      2,
      null,
    );

    const accountId = getAccountIdFromAuthDescriptor(originalAd);

    await registerAccountAdmin(
      client,
      adminUser().signatureProvider,
      originalAd,
    );

    const adToAdd = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Transfer],
      ftKeyStore.id,
    );
    const authDataService = createAuthDataService(connection);
    const evmAuthenticator1 = createAuthenticator(
      accountId,
      [createEvmKeyHandler(testAdFromRegistration(originalAd), evmKeyStore1)],
      authDataService,
    );
    const evmAuthenticator2 = createAuthenticator(
      accountId,
      [createEvmKeyHandler(testAdFromRegistration(originalAd), evmKeyStore2)],
      authDataService,
    );
    const ftAuthenticator = createAuthenticator(
      accountId,
      [createFtKeyHandler(testAdFromRegistration(adToAdd), ftKeyStore)],
      authDataService,
    );
    const partiallySignedTx = await transactionBuilder(
      evmAuthenticator1,
      client,
    )
      .add(addAuthDescriptor(adToAdd), {
        signers: [ftSigner(ftKeyStore.id)],
        skipFtSigning: true,
      })
      .build();

    const evmSignedTx = await signTransaction(
      connection,
      evmAuthenticator2,
      partiallySignedTx,
    );
    const fullySignedTx = await signTransaction(
      connection,
      ftAuthenticator,
      evmSignedTx,
    );
    const receipt = await client.sendTransaction(fullySignedTx);
    expect(receipt.status).toBe("confirmed");
  });

  it("can add a second evm ad to an account with evm master ad", async () => {
    const keyPair1 = encryption.makeKeyPair();
    const keyPair2 = encryption.makeKeyPair();

    const evmKeyStore1 = createInMemoryEvmKeyStore(keyPair1);
    const evmKeyStore2 = createInMemoryEvmKeyStore(keyPair2);

    const originalAd = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Account, AuthFlag.Transfer],
      evmKeyStore1.address,
    );
    const adToAdd = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Transfer],
      evmKeyStore2.address,
    );

    await registerAccountAdmin(
      client,
      adminUser().signatureProvider,
      originalAd,
    );

    const accountId = getAccountIdFromAuthDescriptor(originalAd);
    const authDataService = createAuthDataService(connection);
    const authenticator1 = createAuthenticator(
      accountId,
      [createEvmKeyHandler(testAdFromRegistration(originalAd), evmKeyStore1)],
      authDataService,
    );
    const authenticator2 = createAuthenticator(
      accountId,
      [createEvmKeyHandler(testAdFromRegistration(adToAdd), evmKeyStore2)],
      authDataService,
    );

    const unsignedTx = await transactionBuilder(authenticator1, client)
      .add(addAuthDescriptor(adToAdd), {
        signers: [evmSigner(evmKeyStore2.address)],
      })
      .build();

    const signedTx = await signTransaction(
      connection,
      authenticator2,
      unsignedTx,
    );
    const receipt = await client.sendTransaction(signedTx);
    expect(receipt.status).toBe("confirmed");
  });

  it("can add a second evm ad to an account with ft master ad", async () => {
    const keyPair1 = encryption.makeKeyPair();
    const keyPair2 = encryption.makeKeyPair();

    const ftKeyStore = createInMemoryFtKeyStore(keyPair1);
    const evmKeyStore = createInMemoryEvmKeyStore(keyPair2);

    const originalAd = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Account, AuthFlag.Transfer],
      ftKeyStore.id,
    );
    const adToAdd = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Transfer],
      evmKeyStore.id,
    );

    await registerAccountAdmin(
      client,
      adminUser().signatureProvider,
      originalAd,
    );

    const accountId = gtv.gtvHash(ftKeyStore.pubKey);
    const authDataService = createAuthDataService(connection);
    const authenticator1 = createAuthenticator(
      accountId,
      [createFtKeyHandler(testAdFromRegistration(originalAd), ftKeyStore)],
      authDataService,
    );
    const authenticator2 = createAuthenticator(
      accountId,
      [createEvmKeyHandler(testAdFromRegistration(adToAdd), evmKeyStore)],
      authDataService,
    );

    const unsignedTx = await transactionBuilder(authenticator1, client)
      .add(addAuthDescriptor(adToAdd), {
        signers: [evmSigner(evmKeyStore.id)],
        skipFtSigning: true,
      })
      .build();

    const evmSignedTx = await signTransaction(
      connection,
      authenticator2,
      unsignedTx,
    );
    const signedTx = await signTransaction(
      connection,
      authenticator1,
      evmSignedTx,
    );
    const receipt = await client.sendTransaction(signedTx);
    expect(receipt.status).toBe("confirmed");
  });
});
