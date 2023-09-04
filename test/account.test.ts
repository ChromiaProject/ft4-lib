import * as pcl from "postchain-client";
import { BufferId } from "../client/lib/cryptoUtils";
import testUser, { newSingleSigUser } from "./util/test-user";
import AccountBuilder from "./util/account-builder";
import { Connection } from "../client/lib/ft4/types";
import { createChromiaClient } from "./util/blockchain-util";
import {
  AuthDescriptor,
  authDescriptor,
  createSingleSignatureAuthDescriptor,
  FlagsType,
  singleSigArgs,
  toGtv,
} from "../client/lib/ft4/accounts/auth-descriptor";
import { nop, op } from "../client/lib/ft4/utils";
import adminUser from "./util/admin_user";
import {
  createAuthDataService,
  createConnection,
  createKeyStoreInteractor,
  createSession,
} from "../client/lib/ft4/ft-session";
import { createInMemoryFtKeyStore } from "../client/lib/ft4/authentication/ft/key-stores/in-memory";
import { createAuthenticator, ftAuth } from "../client/lib/ft4/authentication";
import { createAuthenticatedAccount } from "../client/lib/ft4/accounts/account-op-functions";
import { registerAccount } from "../client/lib/ft4/admin/admin-op-functions";
import {
  addAuthDescriptorTo,
  createAccount,
  createTestAuthDescriptor,
} from "./util/util";
import {
  deleteAllAuthDescriptorsExclude,
  addAuthDescriptor,
} from "/ft4/accounts/account-operations";
import { AuthorizationError } from "/ft4/utils/transaction-builder";

let _connection: Connection;
const admin = adminUser();

async function multiSigCall(
  accountId: BufferId,
  multiSigAuthDescriptor: AuthDescriptor,
  signers: (pcl.SignatureProvider | pcl.KeyPair)[],
  ...ops: pcl.Operation[]
) {
  const tx = {
    operations: [ftAuth(accountId, multiSigAuthDescriptor.id), ...ops, nop()],
    signers: signers.map((s) => s.pubKey),
  };

  let signedTx: Buffer | pcl.Transaction = tx;
  for (const signer of signers) {
    signedTx = await _connection.client.signTransaction(signedTx, signer);
  }
  await _connection.client.sendTransaction(signedTx);
}

describe("Test the account", () => {
  beforeAll(async () => {
    _connection = createConnection(await createChromiaClient());
  });

  it("should be in DEV mode", () => {
    expect(process.env.TEST_DEV || "true").toBe("true");
  });

  it("Correctly creates keypair from string", () => {
    const keyPairToImport = pcl.encryption.makeKeyPair();
    const user = pcl.encryption.makeKeyPair(keyPairToImport.privKey); //!
    expect(user.privKey).toEqual(keyPairToImport.privKey);
    expect(user.pubKey).toEqual(keyPairToImport.pubKey);
  });

  it("Correctly creates keypair from buffer", () => {
    const keyPairToImport = pcl.encryption.makeKeyPair();
    const user = pcl.encryption.makeKeyPair(keyPairToImport.privKey);
    expect(user.privKey).toEqual(keyPairToImport.privKey);
    expect(user.pubKey).toEqual(keyPairToImport.pubKey);
  });

  it("Register account on blockchain", async () => {
    const user = testUser();
    const ad = authDescriptor.create.singleSig.withArgs(
      [FlagsType.Account, FlagsType.Transfer],
      user.signatureProvider.pubKey,
    ).andNoRules;

    const account = await registerAccount(
      _connection.client,
      adminUser().signatureProvider,
      ad,
    );

    expect(account).not.toBeNull();
  });

  it("can add new auth descriptor if has account edit rights", async () => {
    const account = await AccountBuilder.account(_connection)
      .withAuthFlags(FlagsType.Account)
      .build();

    const { keyPair: keyPair2, authDescriptor: authDescriptor2 } =
      createTestAuthDescriptor(["A"]);

    await account.addAuthDescriptor(authDescriptor2, keyPair2);

    expect((await account.getAuthDescriptors()).data.length).toBe(2);
  });

  it("cannot add new auth descriptor if account doesn't have account edit rights", async () => {
    const account = await AccountBuilder.account(_connection)
      .withAuthFlags(FlagsType.Transfer)
      .buildAsNonManager();

    const { keyPair: keyPair2, authDescriptor: authDescriptor2 } =
      createTestAuthDescriptor(["A"]);

    await expect(
      account.addAuthDescriptor(authDescriptor2, keyPair2),
    ).rejects.toThrow(AuthorizationError);
  });

  it("updates account if 2 signatures provided", async () => {
    const kp1 = pcl.newSignatureProvider();
    const kp2 = pcl.newSignatureProvider();
    const ad = authDescriptor.create.multiSig.withArgs(["A"], 2, [
      kp1.pubKey,
      kp2.pubKey,
    ]).andNoRules;

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

    expect((await account.getAuthDescriptors()).data.length).toBe(3);
  });

  it("should fail if only one signature provided", async () => {
    const user1 = testUser();
    const user2 = testUser();
    const user3 = {
      authDescriptor: authDescriptor.create.singleSig.withArgs(
        [FlagsType.Transfer],
        user1.signatureProvider.pubKey,
      ).andNoRules,
      signatureProvider: user1.signatureProvider,
      keyManagers: user1.keyManagers,
    };

    const ad = authDescriptor.create.multiSig.withArgs(
      [FlagsType.Account, FlagsType.Transfer],
      2,
      [user1.signatureProvider.pubKey, user2.signatureProvider.pubKey],
    ).andNoRules;

    await registerAccount(_connection.client, admin.signatureProvider, ad);

    const promise = addAuthDescriptorTo(
      _connection.client,
      ad.id,
      user1,
      user3,
    );
    await expect(promise).rejects.toBeInstanceOf(Error);
    const acc = await _connection.getAccountById(ad!.id);
    expect((await acc.getAuthDescriptors()).data.length).toBe(1);
  });

  it("should be returned when queried by participant id", async () => {
    const user = testUser();

    await AccountBuilder.account(_connection)
      .withParticipant(user.signatureProvider)
      .build();

    const accounts = await _connection.getAccountsByParticipantId(
      user.signatureProvider.pubKey,
    );

    expect(accounts.length).toEqual(1);
  });

  it("should return two accounts when public key is used in two accounts", async () => {
    const keyPair1 = pcl.encryption.makeKeyPair();

    await AccountBuilder.account(_connection) //owned by keyPair1
      .withParticipant(pcl.newSignatureProvider(keyPair1))
      .build();
    await AccountBuilder.account(_connection) //keyPair1 is NOT the manager
      .withParticipant(pcl.newSignatureProvider(keyPair1))
      .buildAsNonManager();

    const accounts = await _connection.getAccountsByParticipantId(
      keyPair1.pubKey,
    );

    expect(accounts.length).toEqual(2);
  });

  it("should return account by id", async () => {
    const account = await AccountBuilder.account(_connection).build();

    const foundAccount = await _connection.getAccountById(account.id);

    expect(account.id).toEqual(foundAccount!.id);
  });

  it("should return account by auth descriptor id", async () => {
    const account = await AccountBuilder.account(_connection).build();

    const accounts = await _connection.getAccountsByAuthDescriptorId(
      account.id,
    );

    expect(accounts.data.length).toEqual(1);
  });

  it("returns two accounts by auth descriptor id when auth descriptor is attached to two accounts", async () => {
    const { keyPair: keyPair1, authDescriptor: authDescriptor1 } =
      createTestAuthDescriptor(["A"]);

    await AccountBuilder.account(_connection)
      .withAuthDescriptor(authDescriptor1, [keyPair1])
      .build();
    await AccountBuilder.account(_connection)
      .withAuthDescriptor(authDescriptor1, [keyPair1])
      .build();

    expect(
      (await _connection.getAccountsByAuthDescriptorId(authDescriptor1.id)).data
        .length,
    ).toBe(2);
  });

  it("returns multiple accounts paginated when auth descriptor is attached to multiple accounts", async () => {
    const { keyPair: keyPair1, authDescriptor: authDescriptor1 } =
      createTestAuthDescriptor(["A"]);

    await AccountBuilder.account(_connection)
      .withAuthDescriptor(authDescriptor1, [keyPair1])
      .build();
    await AccountBuilder.account(_connection)
      .withAuthDescriptor(authDescriptor1, [keyPair1])
      .build();
    await AccountBuilder.account(_connection)
      .withAuthDescriptor(authDescriptor1, [keyPair1])
      .build();

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

  it("has correct format when fetching paginated auth descriptors", async () => {
    const keyPair = pcl.encryption.makeKeyPair();
    const keyStore = createInMemoryFtKeyStore(keyPair);
    const ad = authDescriptor.create.singleSig.withArgs(
      ["A"],
      keyStore.pubKey,
    ).andNoRules;

    await createAccount(_connection.client, ad);

    const session = await createKeyStoreInteractor(
      _connection.client,
      keyStore,
    ).getSession(ad.id);

    const keyPair2 = pcl.encryption.makeKeyPair();
    const ad2 = authDescriptor.create.singleSig.withArgs(
      ["T"],
      keyPair2.pubKey,
    ).andNoRules;
    await session.account.addAuthDescriptor(ad2, keyPair2);

    const { data } = await session.account.getAuthDescriptors(1);
    const auth_desc = createSingleSignatureAuthDescriptor(
      singleSigArgs([FlagsType.Account], keyStore.pubKey),
      null,
      data[0].created,
    );
    expect(data[0]).toStrictEqual(auth_desc);
  });

  it("can fetch paginated auth descriptors", async () => {
    const keyPair = pcl.encryption.makeKeyPair();
    const keyStore = createInMemoryFtKeyStore(keyPair);
    const ad = authDescriptor.create.singleSig.withArgs(
      ["A"],
      keyStore.pubKey,
    ).andNoRules;

    await createAccount(_connection.client, ad);

    const session = await createKeyStoreInteractor(
      _connection.client,
      keyStore,
    ).getSession(ad.id);

    const keyPair2 = pcl.encryption.makeKeyPair();
    const ad2 = authDescriptor.create.singleSig.withArgs(
      ["T"],
      keyPair2.pubKey,
    ).andNoRules;
    await session.account.addAuthDescriptor(ad2, keyPair2);

    const { data, nextCursor } = await session.account.getAuthDescriptors(1);
    expect(data.length).toBe(1);
    const { data: data2 } = await session.account.getAuthDescriptors(
      1,
      nextCursor,
    );
    expect(data2.length).toBe(1);
  });

  it("has only one auth descriptor after calling deleteAllExcluding", async () => {
    const { keyPair, authDescriptor } = createTestAuthDescriptor(["A"]);

    const keyHandler =
      createInMemoryFtKeyStore(keyPair).createKeyHandler(authDescriptor);
    const authDataService = createAuthDataService(_connection);
    await createAccount(_connection.client, authDescriptor);

    const session = createSession(
      _connection,
      createAuthenticator(authDescriptor.id, [keyHandler], authDataService),
    );

    const { keyPair: keyPair2, authDescriptor: authDescriptor2 } =
      createTestAuthDescriptor(["A"]);

    await session.account.addAuthDescriptor(authDescriptor2, keyPair2);

    const tx = await session
      .transactionBuilder()
      .add(
        deleteAllAuthDescriptorsExclude(session.account.id, authDescriptor.id),
      )
      .build();
    await _connection.client.sendTransaction(tx);

    expect((await session.account.getAuthDescriptors()).data.length).toBe(1);
  });

  it("should be able to register account by directly calling 'register_account' operation", async () => {
    const user = testUser();

    const adGtv = toGtv(user.authDescriptor);
    const tx = {
      operations: [
        op("ft4.admin.register_account", [adGtv[1], adGtv[2], adGtv[3]]),
      ],
      signers: user.authDescriptor.signers.concat(admin.authDescriptor.signers),
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

    const account = await _connection.getAccountById(user.authDescriptor.id);

    expect(account).not.toBeNull();
  });

  it("is possible for auth descriptor to delete itself without admin flag", async () => {
    const user = testUser();

    const acc = await AccountBuilder.account(_connection)
      .withParticipant(user.signatureProvider)
      .buildAsNonManager();

    //vv this isn't paginated? vv
    const ads = await acc.getAuthDescriptorsByParticipantId(
      user.signatureProvider.pubKey,
    );

    expect((await acc.getAuthDescriptors()).data.length).toBe(2);
    await acc.deleteAuthDescriptor(ads[0].id);
    expect((await acc.getAuthDescriptors()).data.length).toBe(1);
  });

  it("shouldn't be possible for auth descriptor to delete other auth descriptor without admin flag", async () => {
    const keyPair1 = pcl.encryption.makeKeyPair();
    const user1 = newSingleSigUser(keyPair1);
    const account = await AccountBuilder.account(_connection)
      .withParticipant(user1.signatureProvider)
      .withPoints(4)
      .build();

    const { getSession } = createKeyStoreInteractor(
      _connection.client,
      createInMemoryFtKeyStore(keyPair1),
    );
    const session = await getSession(account.id);

    const keyPair2 = pcl.encryption.makeKeyPair();
    const authDescriptor2 = authDescriptor.create.singleSig.withArgs(
      [FlagsType.Transfer],
      keyPair2.pubKey,
    ).andNoRules;

    await session.account.addAuthDescriptor(authDescriptor2, keyPair2);

    const keyPair3 = pcl.encryption.makeKeyPair();
    const authDescriptor3 = authDescriptor.create.singleSig.withArgs(
      [FlagsType.Transfer],
      keyPair3.pubKey,
    ).andNoRules;

    await session.account.addAuthDescriptor(authDescriptor3, keyPair3);

    const keyHandler3 =
      createInMemoryFtKeyStore(keyPair3).createKeyHandler(authDescriptor3);
    const authenticator3 = createAuthenticator(
      account.id,
      [keyHandler3],
      createAuthDataService(_connection),
    );

    const authenticatedAccount3 = createAuthenticatedAccount(
      _connection,
      authenticator3,
    );

    const promise = authenticatedAccount3.deleteAuthDescriptor(
      authDescriptor2.id,
    );

    await expect(promise).rejects.toThrowError();
  });
});
