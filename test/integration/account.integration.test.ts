import * as pcl from "postchain-client";
import { BufferId } from "/ft4/cryptoUtils";
import testUser from "../util/test-user";
import adminUser from "../util/admin_user";
import AccountBuilder from "../util/account-builder";
import { Connection } from "/ft4/types";
import {
  AuthDescriptor,
  authDescriptor,
  createSingleSignatureAuthDescriptor,
  FlagsType,
  singleSigArgs,
  toGtv,
} from "/ft4/accounts/auth-descriptor";
import { nop, op } from "/ft4/utils";
import { createConnection } from "/ft4/ft-session";
import { ftAuth } from "/ft4/authentication";
import { registerAccount } from "/ft4/admin/admin-op-functions";
import {
  addAuthDescriptorTo,
  createAccount,
  createTestAuthDescriptor,
  getSessionForAccount,
} from "../util/util";
import {
  deleteAllAuthDescriptorsExclude,
  addAuthDescriptor,
} from "/ft4/accounts/account-operations";
import { AuthorizationError } from "/ft4/utils/transaction-builder";
import { useChromiaNode } from "/util/chromia-node";

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
  const getClient = useChromiaNode();

  beforeAll(async () => {
    const client = getClient();
    _connection = createConnection(client);
  });

  it("Register account on blockchain", async () => {
    const user = testUser();
    const ad = authDescriptor.create.singleSig.withArgs(
      [FlagsType.Account, FlagsType.Transfer],
      user.signatureProvider.pubKey,
    ).andNoRules;

    const accountPromise = registerAccount(
      _connection.client,
      adminUser().signatureProvider,
      ad,
    );

    await expect(accountPromise).resolves.toBeDefined();
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

  it("returns a session that is aware of the new auth descriptor", async () => {
    const account = await AccountBuilder.account(_connection)
      .withAuthFlags(FlagsType.Account)
      .build();

    const { keyPair: keyPair2, authDescriptor: authDescriptor2 } =
      createTestAuthDescriptor(["T"]);

    const { session } = await account.addAuthDescriptor(
      authDescriptor2,
      keyPair2,
    );

    expect(session.account.authenticator.keyHandlers.length).toBe(2);
    const keyHandler = session.account.authenticator.keyHandlers.find(
      (kh) => !kh.authDescriptor.id.compare(authDescriptor2.id),
    );
    expect(keyHandler.authDescriptor.flags).toEqual(new Set(["T"]));
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

    expect(accounts.data.length).toEqual(1);
  });

  it("should return two accounts when public key is used in two accounts", async () => {
    const keyPair1 = pcl.encryption.makeKeyPair();

    await Promise.all([
      AccountBuilder.account(_connection) //owned by keyPair1
        .withParticipant(pcl.newSignatureProvider(keyPair1))
        .build(),
      AccountBuilder.account(_connection) //keyPair1 is NOT the manager
        .withParticipant(pcl.newSignatureProvider(keyPair1))
        .buildAsNonManager(),
    ]);

    const accounts = await _connection.getAccountsByParticipantId(
      keyPair1.pubKey,
    );

    expect(accounts.data.length).toEqual(2);
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

  it("has correct format when fetching paginated auth descriptors", async () => {
    const keyPair = pcl.encryption.makeKeyPair();
    const ad = authDescriptor.create.singleSig.withArgs(
      ["A"],
      keyPair.pubKey,
    ).andNoRules;

    await createAccount(_connection.client, ad);

    const session = await getSessionForAccount(_connection, ad.id, keyPair);

    const keyPair2 = pcl.encryption.makeKeyPair();
    const ad2 = authDescriptor.create.singleSig.withArgs(
      ["T"],
      keyPair2.pubKey,
    ).andNoRules;
    await session.account.addAuthDescriptor(ad2, keyPair2);

    const { data } = await session.account.getAuthDescriptors(1);
    const authDesc = createSingleSignatureAuthDescriptor(
      singleSigArgs([FlagsType.Account], keyPair.pubKey),
      null,
      data[0].created,
    );
    expect(data[0]).toStrictEqual(authDesc);
  });

  it("can fetch paginated auth descriptors", async () => {
    const keyPair = pcl.encryption.makeKeyPair();
    const ad = authDescriptor.create.singleSig.withArgs(
      ["A"],
      keyPair.pubKey,
    ).andNoRules;

    await createAccount(_connection.client, ad);

    const session = await getSessionForAccount(_connection, ad.id, keyPair);

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

    await createAccount(_connection.client, authDescriptor);

    const session = await getSessionForAccount(
      _connection,
      authDescriptor.id,
      keyPair,
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

  it("registers account by directly calling 'register_account' operation", async () => {
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

  it("auth descriptor deletes itself without admin flag", async () => {
    const user = testUser();

    const acc = await AccountBuilder.account(_connection)
      .withParticipant(user.signatureProvider)
      .buildAsNonManager();

    //vv this isn't paginated? vv
    const ads = await acc.getAuthDescriptorsByParticipantId(
      user.signatureProvider.pubKey,
    );

    expect((await acc.getAuthDescriptors()).data.length).toBe(2);
    await acc.deleteAuthDescriptor(ads.data[0].id);
    expect((await acc.getAuthDescriptors()).data.length).toBe(1);
  });

  it("auth descriptor with admin flag deletes other", async () => {
    const user1 = testUser();
    const user2 = testUser();
    const user3 = testUser();

    const acc1 = await AccountBuilder.account(_connection)
      .withParticipant(user1.signatureProvider)
      .withPoints(2)
      .build();

    const ad2 = authDescriptor.create.singleSig.withArgs(
      ["A"],
      user2.signatureProvider.pubKey,
    ).andNoRules;
    const ad3 = authDescriptor.create.singleSig.withArgs(
      ["A", "T"],
      user3.signatureProvider.pubKey,
    ).andNoRules;

    await Promise.all([
      acc1.addAuthDescriptor(ad2, user2.signatureProvider),
      acc1.addAuthDescriptor(ad3, user3.signatureProvider),
    ]);

    const { account: acc2 } = await getSessionForAccount(
      _connection,
      acc1.id,
      user2.signatureProvider,
    );

    expect((await acc2.getAuthDescriptors()).data.length).toBe(3);
    await acc2.deleteAuthDescriptor(ad3.id);
    expect((await acc2.getAuthDescriptors()).data.length).toBe(2);
  });

  it("auth descriptor without admin flag doesn't delete other", async () => {
    const user1 = testUser();
    const user2 = testUser();
    const user3 = testUser();

    const acc1 = await AccountBuilder.account(_connection)
      .withParticipant(user1.signatureProvider)
      .build();

    const ad2 = authDescriptor.create.singleSig.withArgs(
      ["T"],
      user2.signatureProvider.pubKey,
    ).andNoRules;
    const ad3 = authDescriptor.create.singleSig.withArgs(
      ["T"],
      user3.signatureProvider.pubKey,
    ).andNoRules;

    await Promise.all([
      acc1.addAuthDescriptor(ad2, user2.signatureProvider),
      acc1.addAuthDescriptor(ad3, user3.signatureProvider),
    ]);

    const { account: acc2 } = await getSessionForAccount(
      _connection,
      acc1.id,
      user2.signatureProvider,
    );

    expect((await acc2.getAuthDescriptors()).data.length).toBe(3);
    await expect(acc2.deleteAuthDescriptor(ad3.id)).rejects.toThrow();
    expect((await acc2.getAuthDescriptors()).data.length).toBe(3);
  });

  it("removes auth descriptor from new authenticator", async () => {
    const user1 = testUser();
    const user2 = testUser();

    const acc1 = await AccountBuilder.account(_connection)
      .withParticipant(user1.signatureProvider)
      .withPoints(2)
      .build();

    const ad2 = authDescriptor.create.singleSig.withArgs(
      ["A"],
      user2.signatureProvider.pubKey,
    ).andNoRules;
    const ad3 = authDescriptor.create.singleSig.withArgs(
      ["A", "T"],
      user2.signatureProvider.pubKey,
    ).andNoRules;

    await Promise.all([
      acc1.addAuthDescriptor(ad2, user2.signatureProvider),
      acc1.addAuthDescriptor(ad3, user2.signatureProvider),
    ]);

    const { account: acc2 } = await getSessionForAccount(
      _connection,
      acc1.id,
      user2.signatureProvider,
    );

    expect(acc2.authenticator.keyHandlers.length).toBe(2);
    const { session } = await acc2.deleteAuthDescriptor(ad3.id);
    expect(session.account.authenticator.keyHandlers.length).toBe(1);
  });
});
