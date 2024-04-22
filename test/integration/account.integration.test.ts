import {
  ftAuth,
  createInMemoryEvmKeyStore,
  createInMemoryFtKeyStore,
} from "@ft4/authentication";
import {
  AccountBuilder,
  addAuthDescriptorTo,
  adminUser,
  createAccount,
  createTestAuthDescriptor,
  getAccountIdFromAuthDescriptor,
  getSessionForAccount,
  singleSigUser as testUser,
  useChromiaNode,
} from "@ft4-test/util";
import {
  AuthDescriptorRegistration,
  AuthFlag,
  MultiSig,
  addAuthDescriptor,
  createMultiSigAuthDescriptorRegistration,
  createSingleSigAuthDescriptorRegistration,
  deleteAllAuthDescriptorsExceptMain,
  getAccountMainAuthDescriptor,
  deriveAuthDescriptorId,
  gtv,
} from "@ft4/accounts";
import { registerAccountAdmin } from "@ft4/admin";
import {
  Connection,
  createConnection,
  createKeyStoreInteractor,
} from "@ft4/ft-session";
import { AuthorizationError } from "@ft4/transaction-builder";
import { BufferId, nop, op } from "@ft4/utils";
import { Buffer } from "buffer";
import * as pcl from "postchain-client";

let _connection: Connection;
const admin = adminUser();

async function multiSigCall(
  accountId: BufferId,
  multiSigAuthDescriptor: AuthDescriptorRegistration<MultiSig>,
  signers: (pcl.SignatureProvider | pcl.KeyPair)[],
  ...ops: pcl.Operation[]
) {
  const adId = deriveAuthDescriptorId(multiSigAuthDescriptor);
  let signedTx: Buffer | pcl.Transaction = {
    operations: [ftAuth(accountId, adId), ...ops, nop()],
    signers: signers
      .map((s) => s.pubKey)
      .filter((pk): pk is Buffer => pk !== undefined),
  };
  for (const signer of signers) {
    signedTx = await _connection.client.signTransaction(signedTx, signer);
  }
  await _connection.client.sendTransaction(signedTx);
}

describe("Test the account", () => {
  const getClient = useChromiaNode();

  beforeAll(async () => {
    const client = getClient();
    _connection = createConnection(client);
  });

  it("Register account on blockchain", async () => {
    const user = testUser();
    const ad = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Account, AuthFlag.Transfer],
      user.signatureProvider.pubKey,
      null,
    );

    const accountPromise = registerAccountAdmin(
      _connection.client,
      adminUser().signatureProvider,
      ad,
    );

    await expect(accountPromise).resolves.toBeDefined();
  });

  it("finds main auth descriptor", async () => {
    const { authDescriptor } = createTestAuthDescriptor(["A", "T"]);

    await registerAccountAdmin(
      _connection.client,
      adminUser().signatureProvider,
      authDescriptor,
    );

    const accountId = getAccountIdFromAuthDescriptor(authDescriptor);
    const mainAd = await getAccountMainAuthDescriptor(_connection, accountId);

    expect(mainAd.id).toEqual(authDescriptor.id);
  });

  it("can add new FT auth descriptor if has account edit rights", async () => {
    const account = await AccountBuilder.account(_connection)
      .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
      .build();

    const { keyStore: keyStore2, authDescriptor: authDescriptor2 } =
      createTestAuthDescriptor();

    await account.addAuthDescriptor(authDescriptor2, keyStore2);

    expect((await account.getAuthDescriptors()).length).toBe(2);
  });

  it("can add new EVM auth descriptor if has account edit rights", async () => {
    const account = await AccountBuilder.account(_connection)
      .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
      .build();

    const evmKeyStore = createInMemoryEvmKeyStore(pcl.encryption.makeKeyPair());
    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      [],
      evmKeyStore.id,
    );

    await account.addAuthDescriptor(authDescriptor, evmKeyStore);

    expect((await account.getAuthDescriptors()).length).toBe(2);
  });

  it("returns a session that is aware of the new auth descriptor", async () => {
    const account = await AccountBuilder.account(_connection)
      .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
      .build();

    const { keyStore: keyStore2, authDescriptor: authDescriptor2 } =
      createTestAuthDescriptor(["T"]);

    const { session } = await account.addAuthDescriptor(
      authDescriptor2,
      keyStore2,
    );

    expect(session.account.authenticator.keyHandlers.length).toBe(2);
    const keyHandler = session.account.authenticator.keyHandlers.find((kh) =>
      kh.authDescriptor.id.equals(authDescriptor2.id),
    );
    expect(keyHandler?.authDescriptor.args.flags).toEqual(["T"]);
  });

  it("cannot add new auth descriptor if account doesn't have account edit rights", async () => {
    const account = await AccountBuilder.account(_connection)
      .withAuthFlags(AuthFlag.Transfer)
      .buildAsNonManager();

    const { keyStore: keyStore2, authDescriptor: authDescriptor2 } =
      createTestAuthDescriptor(["A"]);

    await expect(
      account.addAuthDescriptor(authDescriptor2, keyStore2),
    ).rejects.toThrow(AuthorizationError);
  });

  it("updates account if 2 signatures provided", async () => {
    const kp1 = pcl.newSignatureProvider();
    const kp2 = pcl.newSignatureProvider();
    const ad = createMultiSigAuthDescriptorRegistration(
      [AuthFlag.Account],
      [kp1.pubKey, kp2.pubKey],
      2,
      null,
    );

    const account = await AccountBuilder.account(_connection)
      .withAuthDescriptor(ad, [kp1, kp2])
      .build();

    const { keyPair, authDescriptor: ad2 } = createTestAuthDescriptor();

    await multiSigCall(
      account.id,
      ad,
      [kp1, kp2, keyPair],
      addAuthDescriptor(ad2),
    );

    expect((await account.getAuthDescriptors()).length).toBe(3);
  });

  it("should fail if only one signature provided", async () => {
    const user1 = testUser();
    const user2 = testUser();
    const registration = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Transfer],
      user1.signatureProvider.pubKey,
      null,
    );
    const user3 = {
      authDescriptor: {
        ...registration,
        id: deriveAuthDescriptorId(registration),
        accountId: deriveAuthDescriptorId(registration),
        created: new Date(),
      },
      signatureProvider: user1.signatureProvider,
    };

    const ad = createMultiSigAuthDescriptorRegistration(
      [AuthFlag.Account, AuthFlag.Transfer],
      [user1.signatureProvider.pubKey, user2.signatureProvider.pubKey],
      2,
      null,
    );

    await registerAccountAdmin(_connection.client, admin.signatureProvider, ad);

    const accountId = getAccountIdFromAuthDescriptor(ad);
    const promise = addAuthDescriptorTo(_connection.client, accountId, user1, {
      signatureProvider: user3.signatureProvider,
      authDescriptor: user3.authDescriptor,
    });
    await expect(promise).rejects.toBeInstanceOf(Error);
    const acc = await _connection.getAccountById(accountId);
    expect((await acc!.getAuthDescriptors()).length).toBe(1);
  });

  it("should be returned when queried by signer", async () => {
    const user = testUser();

    await AccountBuilder.account(_connection)
      .withSigner(user.signatureProvider)
      .build();

    const accounts = await _connection.getAccountsBySigner(
      user.signatureProvider.pubKey,
    );

    expect(accounts.data.length).toEqual(1);
  });

  it("should return two accounts when public key is used in two accounts", async () => {
    const keyPair1 = pcl.encryption.makeKeyPair();

    await Promise.all([
      AccountBuilder.account(_connection) //owned by keyPair1
        .withSigner(pcl.newSignatureProvider(keyPair1))
        .build(),
      AccountBuilder.account(_connection) //keyPair1 is NOT the manager
        .withSigner(pcl.newSignatureProvider(keyPair1))
        .buildAsNonManager(),
    ]);

    const accounts = await _connection.getAccountsBySigner(keyPair1.pubKey);

    expect(accounts.data.length).toEqual(2);
  });

  it("should return account by id", async () => {
    const account = await AccountBuilder.account(_connection).build();

    const foundAccount = await _connection.getAccountById(account.id);

    expect(account.id).toEqual(foundAccount!.id);
  });

  it("should return account by auth descriptor id", async () => {
    const { authDescriptor } = createTestAuthDescriptor(["A", "T"]);

    await registerAccountAdmin(
      _connection.client,
      adminUser().signatureProvider,
      authDescriptor,
    );

    const accounts = await _connection.getAccountsByAuthDescriptorId(
      authDescriptor.id,
    );

    expect(accounts.data.length).toEqual(1);
  });

  it("returns two accounts by auth descriptor id when auth descriptor is attached to two accounts", async () => {
    const { keyPair: keyPair1, authDescriptor: authDescriptor1 } =
      createTestAuthDescriptor(["A"]);

    await Promise.all([
      AccountBuilder.account(_connection)
        .withAuthDescriptor(authDescriptor1, [keyPair1])
        .build(),
      AccountBuilder.account(_connection)
        .withAuthDescriptor(authDescriptor1, [keyPair1])
        .build(),
    ]);

    expect(
      (await _connection.getAccountsByAuthDescriptorId(authDescriptor1.id)).data
        .length,
    ).toBe(2);
  });

  it("returns multiple accounts paginated when auth descriptor is attached to multiple accounts", async () => {
    const { keyPair: keyPair1, authDescriptor: authDescriptor1 } =
      createTestAuthDescriptor(["A"]);

    await Promise.all([
      AccountBuilder.account(_connection)
        .withAuthDescriptor(authDescriptor1, [keyPair1])
        .build(),
      AccountBuilder.account(_connection)
        .withAuthDescriptor(authDescriptor1, [keyPair1])
        .build(),
      AccountBuilder.account(_connection)
        .withAuthDescriptor(authDescriptor1, [keyPair1])
        .build(),
    ]);

    const { data: accounts1, nextCursor } =
      await _connection.getAccountsByAuthDescriptorId(
        authDescriptor1.id,
        2,
        null,
      );
    expect(accounts1.length).toEqual(2);
    expect(nextCursor).not.toBeNull();

    const { data: accounts2 } = await _connection.getAccountsByAuthDescriptorId(
      authDescriptor1.id,
      2,
      nextCursor,
    );
    expect(accounts2.length).toEqual(1);
  });

  it("has correct format when fetching auth descriptors", async () => {
    const keyPair = pcl.encryption.makeKeyPair();
    const keyStore = createInMemoryFtKeyStore(keyPair);
    const ad = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Account, AuthFlag.Transfer],
      keyStore.pubKey,
      null,
    );

    const accountId = await createAccount(_connection.client, ad);

    const session = await createKeyStoreInteractor(
      _connection.client,
      keyStore,
    ).getSession(accountId);

    const keyPair2 = pcl.encryption.makeKeyPair();
    const ad2 = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Transfer],
      keyPair2.pubKey,
      null,
    );
    await session.account.addAuthDescriptor(
      ad2,
      createInMemoryFtKeyStore(keyPair2),
    );

    const data = await session.account.getAuthDescriptors();
    const authDesc = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Account, AuthFlag.Transfer],
      keyStore.pubKey,
      null,
    );
    expect(data[0]).toMatchObject(authDesc);
  });

  it("has only one auth descriptor after calling deleteAllExceptMain", async () => {
    const { keyPair, authDescriptor } = createTestAuthDescriptor(["A", "T"]);

    const accountId = await createAccount(_connection.client, authDescriptor);

    const session = await getSessionForAccount(_connection, accountId, keyPair);

    const { keyStore: keyStore2, authDescriptor: authDescriptor2 } =
      createTestAuthDescriptor(["A"]);

    await session.account.addAuthDescriptor(authDescriptor2, keyStore2);

    const tx = await session
      .transactionBuilder()
      .add(deleteAllAuthDescriptorsExceptMain())
      .build();
    await _connection.client.sendTransaction(tx);

    const authDescriptors = await session.account.getAuthDescriptors();
    expect(authDescriptors.length).toBe(1);
    expect(authDescriptors[0].id).toEqual(authDescriptor.id);
  });

  it("registers account by directly calling 'register_account' operation", async () => {
    const user = testUser();

    const tx = {
      operations: [
        op(
          "ft4.admin.register_account",
          gtv.authDescriptorRegistrationToGtv(user.authDescriptor),
        ),
      ],
      signers: [
        user.authDescriptor.args.signer,
        admin.authDescriptor.args.signer,
      ],
    };
    let signed = await _connection.client.signTransaction(
      tx,
      user.signatureProvider,
    );
    signed = await _connection.client.signTransaction(
      signed,
      admin.signatureProvider,
    );
    await _connection.client.sendTransaction(signed);

    const account = await _connection.getAccountById(
      user.authDescriptor.accountId,
    );

    expect(account).not.toBeNull();
  });

  it("auth descriptor deletes itself without admin flag", async () => {
    const user = testUser();

    const acc = await AccountBuilder.account(_connection)
      .withSigner(user.signatureProvider)
      .buildAsNonManager();

    //vv this isn't paginated? vv
    const ads = await acc.getAuthDescriptorsBySigner(
      user.signatureProvider.pubKey,
    );

    expect((await acc.getAuthDescriptors()).length).toBe(2);
    await acc.deleteAuthDescriptor(ads[0].id);
    expect((await acc.getAuthDescriptors()).length).toBe(1);
  });

  it("auth descriptor with admin flag deletes other", async () => {
    const user1 = testUser();
    const user2 = testUser();
    const user3 = testUser();

    const acc1 = await AccountBuilder.account(_connection)
      .withSigner(user1.signatureProvider)
      .withPoints(2)
      .build();

    const authDescriptor2 = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Transfer],
      user2.signatureProvider.pubKey,
      null,
    );

    const authDescriptor3 = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Transfer],
      user3.signatureProvider.pubKey,
      null,
    );

    await Promise.all([
      acc1.addAuthDescriptor(authDescriptor2, user2.keyStore),
      acc1.addAuthDescriptor(authDescriptor3, user3.keyStore),
    ]);

    const { account: acc2 } = await getSessionForAccount(
      _connection,
      acc1.id,
      user2.signatureProvider,
    );

    expect((await acc2.getAuthDescriptors()).length).toBe(3);
    await expect(
      acc2.deleteAuthDescriptor(deriveAuthDescriptorId(authDescriptor3)),
    ).rejects.toThrow();
    expect((await acc2.getAuthDescriptors()).length).toBe(3);
  });

  it("removes auth descriptor from new authenticator", async () => {
    const user1 = testUser();
    const user2 = testUser();

    const acc1 = await AccountBuilder.account(_connection)
      .withSigner(user1.signatureProvider)
      .withPoints(2)
      .build();

    const ad2 = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Account],
      user2.signatureProvider.pubKey,
      null,
    );

    const ad3 = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Account, AuthFlag.Transfer],
      user2.signatureProvider.pubKey,
      null,
    );

    await Promise.all([
      acc1.addAuthDescriptor(ad2, user2.keyStore),
      acc1.addAuthDescriptor(ad3, user2.keyStore),
    ]);

    const { account: acc2 } = await getSessionForAccount(
      _connection,
      acc1.id,
      user2.signatureProvider,
    );

    expect(acc2.authenticator.keyHandlers.length).toBe(2);
    const { session } = await acc2.deleteAuthDescriptor(
      deriveAuthDescriptorId(ad3),
    );
    expect(session.account.authenticator.keyHandlers.length).toBe(1);
  });
});
