import * as pcl from "postchain-client";
import { KeyPair } from "../client/lib/cryptoUtils";
import testUser, { newSingleSigUser } from "./util/test-user";
import AccountBuilder from "./util/account-builder";
import { Connection, ftUserSession } from "../client/lib/ft4/types";
import { createChromiaClient, getUserSession } from "./util/blockchain-util";
import {
  authDescriptor,
  AuthType,
  createSingleSignatureAuthDescriptor,
  FlagsType,
  singleSigArgs,
  toGtv,
} from "../client/lib/ft4/accounts/auth-descriptor";
import { registerOp } from "../client/lib/ft4/accounts/account-dev-operations";
import { op } from "../client/lib/ft4/utils";
import adminUser from "./util/admin_user";
import {
  createAuthDataService,
  createConnection,
  createKeyStoreInteractor,
  createSession,
} from "../client/lib/ft4/ft-session";
import { createInMemoryFtKeyStore } from "../client/lib/ft4/authentication/ft/key-stores/in-memory";
import { createAuthenticator } from "../client/lib/ft4/authentication";
import { createAuthenticatedAccount } from "../client/lib/ft4/accounts/account-op-functions";
import {
  addAuthDescriptorTo,
  createAccount,
  createTestAuthDescriptor,
  createTestMultisigAuthDescriptor,
} from "./util/util";
import {
  addAuthDescriptor,
  deleteAllAuthDescriptorsExclude,
} from "/ft4/accounts/account-operations";

let _ft: ftUserSession;
let _connection: Connection;
const admin = adminUser();

describe("Test the account", () => {
  beforeAll(async () => {
    _ft = await getUserSession();
    _connection = createConnection(await createChromiaClient());
  });

  it("should be in DEV mode", () => {
    expect(process.env.TEST_DEV || "true").toBe("true");
  });

  it("Correctly creates keypair from string", () => {
    const keyPairToImport = pcl.encryption.makeKeyPair();
    const user = new KeyPair(pcl.formatter.toString(keyPairToImport.privKey)); //!
    expect(user.privKey).toEqual(keyPairToImport.privKey);
    expect(user.pubKey).toEqual(keyPairToImport.pubKey);
  });

  it("Correctly creates keypair from buffer", () => {
    const keyPairToImport = pcl.encryption.makeKeyPair();
    const user = new KeyPair(keyPairToImport.privKey);
    expect(user.privKey).toEqual(keyPairToImport.privKey);
    expect(user.pubKey).toEqual(keyPairToImport.pubKey);
  });

  it("Register account on blockchain", async () => {
    const user = testUser();
    const ad = authDescriptor.create.singleSig.withArgs(
      [FlagsType.Account, FlagsType.Transfer],
      user.signatureProvider.pubKey
    ).andNoRules;

    const account = await _ft
      .changeUser(user)
      .account.admin.register(adminUser(), ad);

    expect(account).not.toBeNull();
  });

  it("can add new auth descriptor if has account edit rights", async () => {
    const { keyPair, authDescriptor } = createTestAuthDescriptor(["A"]);

    const keyHandler =
      createInMemoryFtKeyStore(keyPair).createKeyHandler(authDescriptor);
    const authDataService = createAuthDataService(_connection);
    await createAccount(_connection.client, authDescriptor);

    const session = createSession(
      _connection,
      createAuthenticator(authDescriptor.id, [keyHandler], authDataService)
    );

    const { keyPair: keyPair2, authDescriptor: authDescriptor2 } =
      createTestAuthDescriptor(["A"]);

    await session.account.addAuthDescriptor(authDescriptor2, keyPair2);

    expect((await session.account.getAuthDescriptors()).length).toBe(2);
  });

  // Skipped due to a likely bug in postchain-client version 1.5.4
  it.skip("cannot add new auth descriptor if account doesn't have account edit rights", async () => {
    const { keyPair: kp1, authDescriptor: ad1 } = createTestAuthDescriptor([
      "A",
    ]);
    const { keyPair: kp2, authDescriptor: ad2 } = createTestAuthDescriptor([
      "T",
    ]);
    const { keyPair: kp3, authDescriptor: ad3 } = createTestAuthDescriptor([
      "T",
    ]);

    const accountId = await createAccount(_connection.client, ad1);

    const user1 = {
      signatureProvider: pcl.newSignatureProvider(kp1),
      authDescriptor: ad1,
    };
    const user2 = {
      signatureProvider: pcl.newSignatureProvider(kp2),
      authDescriptor: ad2,
    };
    const user3 = {
      signatureProvider: pcl.newSignatureProvider(kp3),
      authDescriptor: ad3,
    };

    await addAuthDescriptorTo(_connection.client, accountId, user1, user2);
    const promise = addAuthDescriptorTo(
      _connection.client,
      accountId,
      user2,
      user3
    );
    await expect(promise).rejects.toBe("rejected");
  });

  it("should create new multisig account", async () => {
    const user1 = testUser();
    const user2 = testUser();

    const ad = authDescriptor.create.multiSig.withArgs(
      [FlagsType.Account, FlagsType.Transfer],
      2,
      [user1.signatureProvider.pubKey, user2.signatureProvider.pubKey]
    ).andNoRules;

    const tx = _ft.get.gtxClient.newTransaction(
      ad.signers.concat(admin.authDescriptor.signers)
    );
    tx.addOperation(...registerOp(ad));
    await tx.sign(user1.signatureProvider);
    await tx.sign(user2.signatureProvider);
    await tx.sign(admin.signatureProvider);
    const promise = tx.postAndWaitConfirmation();

    await expect(promise).resolves.not.toThrowError();
  });

  it("updates account if 2 signatures provided", async () => {
    const { keyPairs, authDescriptor } = createTestMultisigAuthDescriptor(2, [
      "A",
    ]);
    const { keyPair, authDescriptor: ad2 } = createTestAuthDescriptor();

    const keyHandlers = keyPairs.map((kp) =>
      createInMemoryFtKeyStore(kp).createKeyHandler(authDescriptor)
    );
    keyHandlers.push(createInMemoryFtKeyStore(keyPair).createKeyHandler(ad2));

    const authDataService = createAuthDataService(_connection);
    await createAccount(_connection.client, authDescriptor);

    const session = createSession(
      _connection,
      createAuthenticator(authDescriptor.id, keyHandlers, authDataService)
    );

    const tx = await session
      .transactionBuilder()
      .add(addAuthDescriptor(ad2))
      .buildWithSigners(...keyHandlers);
    await _connection.client.sendTransaction(tx);

    expect((await session.account.getAuthDescriptors()).length).toBe(2);
  });

  // Skipped due to possible bug in postchain-client
  it.skip("should fail if only one signature provided", async () => {
    const user1 = testUser();
    const user2 = testUser();
    const user3 = {
      authDescriptor: authDescriptor.create.singleSig.withArgs(
        [FlagsType.Transfer],
        user1.signatureProvider.pubKey
      ).andNoRules,
      signatureProvider: user1.signatureProvider,
      keyManagers: user1.keyManagers,
    };

    const ad = authDescriptor.create.multiSig.withArgs(
      [FlagsType.Account, FlagsType.Transfer],
      2,
      [user1.signatureProvider.pubKey, user2.signatureProvider.pubKey]
    ).andNoRules;

    const tx = _ft.get.gtxClient.newTransaction(
      ad.signers.concat(admin.authDescriptor.signers)
    );
    tx.addOperation(...registerOp(ad));
    await tx.sign(user1.signatureProvider);
    await tx.sign(user2.signatureProvider);
    await tx.sign(admin.signatureProvider);
    await tx.postAndWaitConfirmation();

    const promise = addAuthDescriptorTo(
      _connection.client,
      ad.id,
      user1,
      user3
    );
    await expect(promise).rejects.toBeInstanceOf(Error);
    expect((await _ft.get.account.by.id(ad!.id))!.authDescriptors.length).toBe(
      1
    );
  });

  it("should be returned when queried by participant id", async () => {
    const user = testUser();
    const ft = _ft.changeUser(user);

    await AccountBuilder.account(ft).build();

    const accounts = await _connection.getAccountsByParticipantId(
      user.signatureProvider.pubKey
    );

    expect(accounts.length).toEqual(1);
  });

  it("should return two accounts when public key is used in two accounts", async () => {
    const keyPair1 = new KeyPair();
    const keyPair2 = new KeyPair();
    const user1 = newSingleSigUser(keyPair1);
    const user2 = newSingleSigUser(keyPair2);
    const ft1 = _ft.changeUser(user1);
    const ft2 = _ft.changeUser(user2);

    await AccountBuilder.account(ft1).build();

    const account2 = await AccountBuilder.account(ft2).withPoints(1).build();

    const { getSession } = createKeyStoreInteractor(
      _connection.client,
      createInMemoryFtKeyStore(keyPair2)
    );
    const session = await getSession(account2.id);

    await session.account.addAuthDescriptor(user1.authDescriptor, keyPair1);

    const accounts = await session.getAccountsByParticipantId(
      user1.signatureProvider.pubKey
    );

    expect(accounts.length).toEqual(2);
  });

  it("should return account by id", async () => {
    const user = testUser();
    const ft = _ft.changeUser(user);

    const account = await AccountBuilder.account(ft).build();

    const foundAccount = await _connection.getAccountById(account.id);

    expect(account.id).toEqual(foundAccount!.id);
  });

  it("should return account by auth descriptor id", async () => {
    const user = testUser();
    const ft = _ft.changeUser(user);

    const account = await AccountBuilder.account(ft).build();

    const accounts = await _connection.getAccountsByAuthDescriptorId(
      account.id
    );

    expect(accounts.length).toEqual(1);
  });

  it("returns two accounts by auth descriptor id when auth descriptor is attached to two accounts", async () => {
    const { keyPair: keyPair1, authDescriptor: authDescriptor1 } =
      createTestAuthDescriptor(["A"]);
    const { keyPair: keyPair2, authDescriptor: authDescriptor2 } =
      createTestAuthDescriptor(["A"]);

    const keyHandler1 =
      createInMemoryFtKeyStore(keyPair1).createKeyHandler(authDescriptor1);
    const authDataService1 = createAuthDataService(_connection);

    await createAccount(_connection.client, authDescriptor1);
    await createAccount(_connection.client, authDescriptor2);

    const session = createSession(
      _connection,
      createAuthenticator(authDescriptor1.id, [keyHandler1], authDataService1)
    );

    await session.account.addAuthDescriptor(authDescriptor2, keyPair2);
    expect(
      (await _connection.getAccountsByAuthDescriptorId(authDescriptor2.id))
        .length
    ).toBe(2);
  });

  it("returns multiple accounts paginated when auth descriptor is attached to multiple accounts", async () => {
    const user1 = testUser();
    const user2 = testUser();
    const user3 = testUser();
    const ft1 = _ft.changeUser(user1);
    const ft2 = _ft.changeUser(user2);
    const ft3 = _ft.changeUser(user3);

    const account1 = await AccountBuilder.account(ft1).build();
    const account2 = await AccountBuilder.account(ft2).build();
    const account3 = await AccountBuilder.account(ft3).build();

    await addAuthDescriptorTo(_connection.client, account2.id, user2, user1);
    await addAuthDescriptorTo(_connection.client, account3.id, user3, user1);

    const { data: accounts1, nextCursor } =
      await _connection.getAccountsByAuthDescriptorIdPaginated(
        account1.id,
        2,
        null
      );
    expect(accounts1.length).toEqual(2);

    const { data: accounts2 } =
      await _connection.getAccountsByAuthDescriptorIdPaginated(
        account1.id,
        2,
        nextCursor
      );
    expect(accounts2.length).toEqual(1);
  });

  it("has correct format when fetching paginated auth descriptors", async () => {
    const keyPair = new KeyPair();
    const keyStore = createInMemoryFtKeyStore(keyPair);
    const ad = authDescriptor.create.singleSig.withArgs(
      ["A"],
      keyStore.pubKey
    ).andNoRules;

    await createAccount(_connection.client, ad);

    const session = await createKeyStoreInteractor(
      _connection.client,
      keyStore
    ).getSession(ad.id);

    const keyPair2 = new KeyPair();
    const ad2 = authDescriptor.create.singleSig.withArgs(
      ["T"],
      keyPair2.pubKey
    ).andNoRules;
    await session.account.addAuthDescriptor(ad2, keyPair2);

    const { data } = await session.account.getAuthDescriptorsPaginated(1);
    const auth_desc = createSingleSignatureAuthDescriptor(
      AuthType.single_sig,
      singleSigArgs([FlagsType.Account], keyStore.pubKey),
      null
    );
    expect(data[0]).toStrictEqual(auth_desc);
  });

  it("can fetch paginated auth descriptors", async () => {
    const keyPair = new KeyPair();
    const keyStore = createInMemoryFtKeyStore(keyPair);
    const ad = authDescriptor.create.singleSig.withArgs(
      ["A"],
      keyStore.pubKey
    ).andNoRules;

    await createAccount(_connection.client, ad);

    const session = await createKeyStoreInteractor(
      _connection.client,
      keyStore
    ).getSession(ad.id);

    const keyPair2 = new KeyPair();
    const ad2 = authDescriptor.create.singleSig.withArgs(
      ["T"],
      keyPair2.pubKey
    ).andNoRules;
    await session.account.addAuthDescriptor(ad2, keyPair2);

    const { data, nextCursor } =
      await session.account.getAuthDescriptorsPaginated(1);
    expect(data.length).toBe(1);
    const { data: data2 } = await session.account.getAuthDescriptorsPaginated(
      1,
      nextCursor
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
      createAuthenticator(authDescriptor.id, [keyHandler], authDataService)
    );

    const { keyPair: keyPair2, authDescriptor: authDescriptor2 } =
      createTestAuthDescriptor(["A"]);

    await session.account.addAuthDescriptor(authDescriptor2, keyPair2);

    const tx = await session
      .transactionBuilder()
      .add(
        deleteAllAuthDescriptorsExclude(session.account.id, authDescriptor.id)
      )
      .build();
    await _connection.client.sendTransaction(tx);

    expect((await session.account.getAuthDescriptors()).length).toBe(1);
  });

  it("should be able to register account by directly calling 'register_account' operation", async () => {
    const user = testUser();

    const tx = _ft.get.gtxClient.newTransaction(
      user.authDescriptor.signers.concat(admin.authDescriptor.signers)
    );
    tx.addOperation(
      ...op("ft4.admin.register_account", toGtv(user.authDescriptor))
    );
    await tx.sign(user.signatureProvider);
    await tx.sign(admin.signatureProvider);
    await tx.postAndWaitConfirmation();

    const account = await _ft.get.account.by.id(user.authDescriptor.id);

    expect(account).not.toBeNull();
  });

  it.skip("is possible for auth descriptor to delete itself without admin flag", async () => {
    const { keyPair, authDescriptor } = createTestAuthDescriptor(["T"]);
    const keyHandler =
      createInMemoryFtKeyStore(keyPair).createKeyHandler(authDescriptor);
    const authDataService = createAuthDataService(_connection);
    await createAccount(_connection.client, authDescriptor);

    const session = createSession(
      _connection,
      createAuthenticator(authDescriptor.id, [keyHandler], authDataService)
    );

    await session.account.deleteAuthDescriptor(authDescriptor.id);
    expect((await session.account.getAuthDescriptors()).length).toBe(0);
  });

  it("shouldn't be possible for auth descriptor to delete other auth descriptor without admin flag", async () => {
    const keyPair1 = new KeyPair();
    const user1 = newSingleSigUser(keyPair1);
    const ft = _ft.changeUser(user1);

    const account = await AccountBuilder.account(ft)
      .withParticipants([user1.signatureProvider])
      .withPoints(4)
      .build();

    const { getSession } = createKeyStoreInteractor(
      _connection.client,
      createInMemoryFtKeyStore(keyPair1)
    );
    const session = await getSession(account.id);

    const keyPair2 = new KeyPair();
    const authDescriptor2 = authDescriptor.create.singleSig.withArgs(
      [FlagsType.Transfer],
      keyPair2.pubKey
    ).andNoRules;

    await session.account.addAuthDescriptor(authDescriptor2, keyPair2);

    const keyPair3 = new KeyPair();
    const authDescriptor3 = authDescriptor.create.singleSig.withArgs(
      [FlagsType.Transfer],
      keyPair3.pubKey
    ).andNoRules;

    await session.account.addAuthDescriptor(authDescriptor3, keyPair3);

    const keyHandler3 =
      createInMemoryFtKeyStore(keyPair3).createKeyHandler(authDescriptor3);
    const authenticator3 = createAuthenticator(
      account.id,
      [keyHandler3],
      createAuthDataService(_connection)
    );

    const authenticatedAccount3 = createAuthenticatedAccount(
      _connection,
      authenticator3
    );

    const promise = authenticatedAccount3.deleteAuthDescriptor(
      authDescriptor2.id
    );

    await expect(promise).rejects.toThrowError();
  });
});
