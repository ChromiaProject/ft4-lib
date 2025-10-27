import {
  adminUser,
  createTestAuthDescriptor,
  createTestAuthDescriptorWithSigner,
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
  EvmKeyStore,
  FtKeyStore,
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
import {
  signTransaction,
  signTransactionWithKeyStores,
  transactionBuilder,
} from "@ft4/transaction-builder";
import { getExpectedAccountIdFromMainAuthDescriptor, op } from "@ft4/utils";
import { IClient, KeyPair, encryption, gtv, gtx } from "postchain-client";

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

  let keyPair1: KeyPair;
  let keyPair2: KeyPair;
  let keyPair3: KeyPair;
  let keyPair4: KeyPair;
  let evmKeyStore1: EvmKeyStore;
  let evmKeyStore2: EvmKeyStore;
  let evmKeyStore3: EvmKeyStore;
  let ftKeyStore: FtKeyStore;

  beforeEach(async () => {
    keyPair1 = encryption.makeKeyPair();
    keyPair2 = encryption.makeKeyPair();
    keyPair3 = encryption.makeKeyPair();
    keyPair4 = encryption.makeKeyPair();
    evmKeyStore1 = createInMemoryEvmKeyStore(keyPair1);
    evmKeyStore2 = createInMemoryEvmKeyStore(keyPair2);
    evmKeyStore3 = createInMemoryEvmKeyStore(keyPair3);
    ftKeyStore = createInMemoryFtKeyStore(keyPair4);
  });

  describe("signTransaction()", () => {
    it("correctly signs a transaction with GTX signatures", async () => {
      const { keyPair, authDescriptor: ad } = createTestAuthDescriptor([
        AuthFlag.Account,
        AuthFlag.Transfer,
      ]);
      await registerAccountAdmin(client, adminUser().signatureProvider, ad);

      const keyStore = createInMemoryFtKeyStore(keyPair);
      const authenticator = createAuthenticator(
        getExpectedAccountIdFromMainAuthDescriptor(ad, client),
        [createFtKeyHandler(testAdFromRegistration(ad), keyStore)],
        authDataService,
      );

      const tx = await transactionBuilder(authenticator, client)
        .add(op("ft4.test.authenticated_operation"), {
          skipFtSigning: true,
        })
        .build();

      const signedTx = await signTransaction(
        authenticator,
        gtx.deserialize(tx),
      );
      expect(signedTx).not.toEqual(tx);

      const receipt = await client.sendTransaction(signedTx);
      expect(receipt.status).toBe("confirmed");
    });

    it("correctly signs a transaction with both GTX and evm signatures", async () => {
      const evmKeyStore = createInMemoryEvmKeyStore(keyPair1);
      const ftKeyStore = createInMemoryFtKeyStore(keyPair1);
      const ad1 = createTestAuthDescriptorWithSigner(
        gtv.gtvHash(keyPair1.pubKey, client.config.merkleHashVersion),
        evmKeyStore.id,
        [...Object.values(AuthFlag)],
        null,
      );
      const ad2 = createTestAuthDescriptorWithSigner(
        gtv.gtvHash(keyPair1.pubKey, client.config.merkleHashVersion),
        ftKeyStore.id,
        [...Object.values(AuthFlag)],
        null,
      );

      const accountId1 = getExpectedAccountIdFromMainAuthDescriptor(
        ad1,
        client,
      );
      const accountId2 = getExpectedAccountIdFromMainAuthDescriptor(
        ad2,
        client,
      );

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
        .add(op("ft4.test.authenticated_operation"))
        .add(op("ft4.test.authenticated_operation"), {
          authenticator: ftAuthenticator,
          skipFtSigning: true,
        })
        .build();

      const ftSignedTx = await signTransaction(
        ftAuthenticator,
        gtx.deserialize(tx),
      );
      expect(ftSignedTx).not.toEqual(tx);

      const receipt = await client.sendTransaction(ftSignedTx);
      expect(receipt.status).toBe("confirmed");
    });

    it("correctly signs a transaction with optional parameters", async () => {
      const evmKeyStore = createInMemoryEvmKeyStore(keyPair1);
      const ftKeyStore = createInMemoryFtKeyStore(keyPair1);
      const ad1 = createTestAuthDescriptorWithSigner(
        gtv.gtvHash(keyPair1.pubKey, client.config.merkleHashVersion),
        evmKeyStore.id,
        [...Object.values(AuthFlag)],
        null,
      );
      const ad2 = createTestAuthDescriptorWithSigner(
        gtv.gtvHash(keyPair1.pubKey, client.config.merkleHashVersion),
        ftKeyStore.id,
        [...Object.values(AuthFlag)],
        null,
      );

      const accountId1 = getExpectedAccountIdFromMainAuthDescriptor(
        ad1,
        client,
      );
      const accountId2 = getExpectedAccountIdFromMainAuthDescriptor(
        ad2,
        client,
      );

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
        .add(op("test_optional_params", 100, "alice"))
        .add(op("test_optional_params", 100, "alice"), {
          authenticator: ftAuthenticator,
          skipFtSigning: true,
        })
        .build();

      const ftSignedTx = await signTransaction(
        ftAuthenticator,
        gtx.deserialize(tx),
      );
      expect(ftSignedTx).not.toEqual(tx);

      const receipt = await client.sendTransaction(ftSignedTx);
      expect(receipt.status).toBe("confirmed");

      const optionalParamsTx = await transactionBuilder(
        evmAuthenticator,
        client,
      )
        .add(op("test_optional_params", 100))
        .add(op("test_optional_params", 100), {
          authenticator: ftAuthenticator,
          skipFtSigning: true,
        })
        .build();
      const optionalParamsSignedTx = await signTransaction(
        ftAuthenticator,
        gtx.deserialize(optionalParamsTx),
      );

      expect(optionalParamsSignedTx).not.toEqual(optionalParamsTx);
      const receipt2 = await client.sendTransaction(optionalParamsSignedTx);
      expect(receipt2.status).toBe("confirmed");
    });

    it("correctly signs an evm multisig operation", async () => {
      const originalAd = createMultiSigAuthDescriptorRegistration(
        [...Object.values(AuthFlag)],
        [evmKeyStore1.id, evmKeyStore2.id],
        2,
        null,
      );

      const accountId = getExpectedAccountIdFromMainAuthDescriptor(
        originalAd,
        client,
      );

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
        authenticator2,
        partiallySignedTx,
      );
      expect(evmSignedTx).not.toEqual(partiallySignedTx);

      const receipt = await client.sendTransaction(evmSignedTx);
      expect(receipt.status).toBe("confirmed");
    });

    it("Fails if some signatures are missing from main ad", async () => {
      const originalAd = createMultiSigAuthDescriptorRegistration(
        [...Object.values(AuthFlag)],
        [evmKeyStore1.id, evmKeyStore2.id],
        2,
        null,
      );

      const accountId = getExpectedAccountIdFromMainAuthDescriptor(
        originalAd,
        client,
      );

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
      const partiallySignedTx = await transactionBuilder(
        evmAuthenticator,
        client,
      )
        .add(addAuthDescriptor(adToAdd), {
          signers: [ftSigner(ftKeyStore.id)],
          skipFtSigning: true,
        })
        .build();

      const signedTx = await signTransaction(
        ftAuthenticator,
        partiallySignedTx,
      );
      expect(signedTx).not.toEqual(partiallySignedTx);
      await expect(client.sendTransaction(signedTx)).rejects.toThrow(
        /failed: INSUFFICIENT SIGNERS: Minimum number of valid signatures not reached. Expected <2>, found <1>./,
      );
    });

    it("succeeds if m of n signatures is provided", async () => {
      const originalAd = createMultiSigAuthDescriptorRegistration(
        [...Object.values(AuthFlag)],
        [evmKeyStore1.id, evmKeyStore2.id, evmKeyStore3.id],
        2,
        null,
      );

      const accountId = getExpectedAccountIdFromMainAuthDescriptor(
        originalAd,
        client,
      );

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
        evmAuthenticator2,
        partiallySignedTx,
      );
      const fullySignedTx = await signTransaction(ftAuthenticator, evmSignedTx);
      expect(fullySignedTx).not.toEqual(partiallySignedTx);

      const receipt = await client.sendTransaction(fullySignedTx);
      expect(receipt.status).toBe("confirmed");
    });

    it("can add a second evm ad to an account with evm master ad", async () => {
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

      const accountId = getExpectedAccountIdFromMainAuthDescriptor(
        originalAd,
        client,
      );
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

      const signedTx = await signTransaction(authenticator2, unsignedTx);
      expect(signedTx).not.toEqual(unsignedTx);

      const receipt = await client.sendTransaction(signedTx);
      expect(receipt.status).toBe("confirmed");
    });

    it("can add a second evm ad to an account with ft master ad", async () => {
      const originalAd = createSingleSigAuthDescriptorRegistration(
        [AuthFlag.Account, AuthFlag.Transfer],
        ftKeyStore.id,
      );
      const adToAdd = createSingleSigAuthDescriptorRegistration(
        [AuthFlag.Transfer],
        evmKeyStore1.id,
      );

      await registerAccountAdmin(
        client,
        adminUser().signatureProvider,
        originalAd,
      );

      const accountId = gtv.gtvHash(
        ftKeyStore.pubKey,
        client.config.merkleHashVersion,
      );
      const authDataService = createAuthDataService(connection);
      const authenticator1 = createAuthenticator(
        accountId,
        [createFtKeyHandler(testAdFromRegistration(originalAd), ftKeyStore)],
        authDataService,
      );
      const authenticator2 = createAuthenticator(
        accountId,
        [createEvmKeyHandler(testAdFromRegistration(adToAdd), evmKeyStore1)],
        authDataService,
      );

      const unsignedTx = await transactionBuilder(authenticator1, client)
        .add(addAuthDescriptor(adToAdd), {
          signers: [evmSigner(evmKeyStore1.id)],
          skipFtSigning: true,
        })
        .build();

      const evmSignedTx = await signTransaction(authenticator2, unsignedTx);
      const signedTx = await signTransaction(authenticator1, evmSignedTx);
      expect(signedTx).not.toEqual(unsignedTx);

      const receipt = await client.sendTransaction(signedTx);
      expect(receipt.status).toBe("confirmed");
    });
  });

  describe("signTransactionWithKeyStores()", () => {
    it("correctly signs a transaction with GTX signatures", async () => {
      const { keyPair, authDescriptor: ad } = createTestAuthDescriptor([
        AuthFlag.Account,
        AuthFlag.Transfer,
      ]);
      await registerAccountAdmin(client, adminUser().signatureProvider, ad);

      const keyStore = createInMemoryFtKeyStore(keyPair);
      const authenticator = createAuthenticator(
        getExpectedAccountIdFromMainAuthDescriptor(ad, client),
        [createFtKeyHandler(testAdFromRegistration(ad), keyStore)],
        authDataService,
      );

      const tx = await transactionBuilder(authenticator, client)
        .add(op("ft4.test.authenticated_operation"), {
          skipFtSigning: true,
        })
        .build();

      const signedTx = await signTransactionWithKeyStores(
        [keyStore],
        authDataService,
        gtx.deserialize(tx),
      );
      expect(signedTx).not.toEqual(tx);

      const receipt = await client.sendTransaction(signedTx);
      expect(receipt.status).toBe("confirmed");
    });

    it("correctly signs a transaction with both GTX and evm signatures", async () => {
      const keyPair = encryption.makeKeyPair();
      const evmKeyStore = createInMemoryEvmKeyStore(keyPair);
      const ftKeyStore = createInMemoryFtKeyStore(keyPair);
      const ad1 = createTestAuthDescriptorWithSigner(
        gtv.gtvHash(keyPair.pubKey, client.config.merkleHashVersion),
        evmKeyStore.id,
        [...Object.values(AuthFlag)],
        null,
      );
      const ad2 = createTestAuthDescriptorWithSigner(
        gtv.gtvHash(keyPair.pubKey, client.config.merkleHashVersion),
        ftKeyStore.id,
        [...Object.values(AuthFlag)],
        null,
      );

      const accountId1 = getExpectedAccountIdFromMainAuthDescriptor(
        ad1,
        client,
      );
      const accountId2 = getExpectedAccountIdFromMainAuthDescriptor(
        ad2,
        client,
      );

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
        .add(op("ft4.test.authenticated_operation"))
        .add(op("ft4.test.authenticated_operation"), {
          authenticator: ftAuthenticator,
          skipFtSigning: true,
        })
        .build();

      const ftSignedTx = await signTransactionWithKeyStores(
        [ftKeyStore],
        authDataService,
        gtx.deserialize(tx),
      );
      expect(ftSignedTx).not.toEqual(tx);

      const receipt = await client.sendTransaction(ftSignedTx);
      expect(receipt.status).toBe("confirmed");
    });

    it("Fails if some signatures is missing from main ad", async () => {
      const originalAd = createMultiSigAuthDescriptorRegistration(
        [...Object.values(AuthFlag)],
        [evmKeyStore1.id, evmKeyStore2.id],
        2,
        null,
      );

      const accountId = getExpectedAccountIdFromMainAuthDescriptor(
        originalAd,
        client,
      );

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
      const partiallySignedTx = await transactionBuilder(
        evmAuthenticator,
        client,
      )
        .add(addAuthDescriptor(adToAdd), {
          signers: [ftSigner(ftKeyStore.id)],
          skipFtSigning: true,
        })
        .build();

      const signedTx = await signTransactionWithKeyStores(
        [ftKeyStore],
        authDataService,
        partiallySignedTx,
      );
      expect(signedTx).not.toEqual(partiallySignedTx);

      await expect(client.sendTransaction(signedTx)).rejects.toThrow(
        /failed: INSUFFICIENT SIGNERS: Minimum number of valid signatures not reached. Expected <2>, found <1>./,
      );
    });

    it("can add a second evm ad to an account with evm master ad", async () => {
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

      const accountId = getExpectedAccountIdFromMainAuthDescriptor(
        originalAd,
        client,
      );
      const authDataService = createAuthDataService(connection);
      const authenticator1 = createAuthenticator(
        accountId,
        [createEvmKeyHandler(testAdFromRegistration(originalAd), evmKeyStore1)],
        authDataService,
      );
      const unsignedTx = await transactionBuilder(authenticator1, client)
        .add(addAuthDescriptor(adToAdd), {
          signers: [evmSigner(evmKeyStore2.address)],
        })
        .build();

      const signedTx = await signTransactionWithKeyStores(
        [evmKeyStore2],
        authDataService,
        unsignedTx,
      );
      expect(signedTx).not.toEqual(unsignedTx);

      const receipt = await client.sendTransaction(signedTx);
      expect(receipt.status).toBe("confirmed");
    });

    it("can add a second evm ad to an account with ft master ad", async () => {
      const originalAd = createSingleSigAuthDescriptorRegistration(
        [AuthFlag.Account, AuthFlag.Transfer],
        ftKeyStore.id,
      );
      const adToAdd = createSingleSigAuthDescriptorRegistration(
        [AuthFlag.Transfer],
        evmKeyStore1.id,
      );

      await registerAccountAdmin(
        client,
        adminUser().signatureProvider,
        originalAd,
      );

      const accountId = getExpectedAccountIdFromMainAuthDescriptor(
        originalAd,
        client,
      );
      const authDataService = createAuthDataService(connection);
      const authenticator1 = createAuthenticator(
        accountId,
        [createFtKeyHandler(testAdFromRegistration(originalAd), ftKeyStore)],
        authDataService,
      );

      const unsignedTx = await transactionBuilder(authenticator1, client)
        .add(addAuthDescriptor(adToAdd), {
          signers: [evmSigner(evmKeyStore1.id)],
          skipFtSigning: true,
        })
        .build();

      const evmSignedTx = await signTransactionWithKeyStores(
        [evmKeyStore1],
        authDataService,
        unsignedTx,
      );
      const signedTx = await signTransactionWithKeyStores(
        [ftKeyStore],
        authDataService,
        evmSignedTx,
      );
      expect(signedTx).not.toEqual(unsignedTx);

      const receipt = await client.sendTransaction(signedTx);
      expect(receipt.status).toBe("confirmed");
    });
  });
});
