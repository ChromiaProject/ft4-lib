import * as pcl from "postchain-client";
import { KeyPair } from "../client/lib/cryptoUtils";
import testUser, { newSingleSigUser } from "./util/test-user";
import AccountBuilder from "./util/account-builder";
import { Account, User } from "../client/lib/ft3/account/types";
import { Connection, ftUserSession } from "../client/lib/ft3/types";
import { getUserSession } from "./util/blockchain-util";
import {
  authDescriptor,
  FlagsType,
  toGtv,
} from "../client/lib/ft3/account/auth-descriptor";
import { registerOp } from "../client/lib/ft3/account/account-dev-operations";
import { addAuthDescriptorOp } from "../client/lib/ft3/account/account-operations";
import { op } from "../client/lib/ft3/utils";
import adminUser from "./util/admin_user";
import {
  createAuthDataService,
  createConnection,
  createKeyStoreInteractor,
} from "../client/lib/ft3/ft-session";
import { createInMemoryFTKeyStore } from "../client/lib/ft3/authentication/ft/key-stores/in-memory";
import { createAuthenicator } from "../client/lib/ft3/authentication";
import { createAuthenticatedAccount } from "../client/lib/ft3/account/account-op-functions";

async function addAuthDescriptorTo(
  account: Account,
  newUser: User,
  adminSession: ftUserSession
) {
  await adminSession.account.authDescriptor.add(newUser, account.id);
}

let _ft: ftUserSession;
let _connection: Connection;
const admin = adminUser();

describe("Test the account", () => {
  beforeAll(async () => {
    _ft = await getUserSession();
    _connection = createConnection(_ft.get.gtxClient);
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
    const user = testUser();
    const user2 = {
      authDescriptor: authDescriptor.create.singleSig.withArgs(
        [FlagsType.Transfer],
        user.signatureProvider.pubKey
      ).andNoRules,
      signatureProvider: user.signatureProvider,
      keyManagers: user.keyManagers,
    };
    const ft = _ft.changeUser(user);

    const account = await AccountBuilder.account(ft).withPoints(1).build();

    expect(account).not.toBeNull();

    await ft.account.authDescriptor.add(user2, account.id);
    expect(
      (await ft.get.account.by.id(account.id))!.authDescriptors.length
    ).toBe(2);
  });

  it("cannot add new auth descriptor if account doesn't have account edit rights", async () => {
    const user = testUser();
    const user2 = {
      authDescriptor: authDescriptor.create.singleSig.withArgs(
        [FlagsType.Transfer],
        user.signatureProvider.pubKey
      ).andNoRules,
      signatureProvider: user.signatureProvider,
      keyManagers: user.keyManagers,
    };
    const ft = _ft.changeUser(user);

    const account = await ft.account.admin.register(
      adminUser(),
      authDescriptor.create.singleSig.withArgs(
        [FlagsType.Transfer],
        user.signatureProvider.pubKey
      ).andNoRules
    );
    expect(account).not.toBeNull();

    const promise = ft.account.authDescriptor.add(user2, account.id);
    await expect(promise).rejects.toBeInstanceOf(Error);
    expect(
      (await ft.get.account.by.id(account.id))!.authDescriptors.length
    ).toBe(1);
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

  it("should update account if 2 signatures provided", async () => {
    const sigProv1 = pcl.gtx.newSignatureProvider();
    const sigProv2 = pcl.gtx.newSignatureProvider();
    const sigProv3 = pcl.gtx.newSignatureProvider();

    const ad = authDescriptor.create.multiSig.withArgs(
      [FlagsType.Account, FlagsType.Transfer],
      2,
      [sigProv1.pubKey, sigProv2.pubKey]
    ).andNoRules;

    const user1: User = {
      ...testUser(),
      signatureProvider: sigProv1,
      authDescriptor: ad,
    };

    let tx = _ft.get.gtxClient.newTransaction(
      ad.signers.concat(admin.authDescriptor.signers)
    );
    tx.addOperation(...registerOp(ad));
    await tx.sign(user1.signatureProvider);
    await tx.sign(sigProv2);
    await tx.sign(admin.signatureProvider);
    await tx.postAndWaitConfirmation();

    tx = _ft.get.gtxClient.newTransaction([
      sigProv1.pubKey,
      sigProv2.pubKey,
      sigProv3.pubKey,
    ]);
    tx.addOperation(
      ...addAuthDescriptorOp(
        ad.id,
        ad.id,
        authDescriptor.create.singleSig.withArgs(
          [FlagsType.Transfer],
          sigProv3.pubKey
        ).andNoRules
      )
    );

    await tx.sign(sigProv1);
    await tx.sign(sigProv2);
    await tx.sign(sigProv3);
    await tx.postAndWaitConfirmation();

    const account = await _ft.get.account.by.id(ad.id);

    expect(account!.authDescriptors.length).toBe(2);
  });

  it("should fail if only one signature provided", async () => {
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

    const account = await _ft.get.account.by.id(ad.id);

    const promise = _ft.account.authDescriptor.add(user3, account!.id);
    await expect(promise).rejects.toBeInstanceOf(Error);
    expect(
      (await _ft.get.account.by.id(account!.id))!.authDescriptors.length
    ).toBe(1);
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
      _ft.get.gtxClient,
      createInMemoryFTKeyStore(keyPair2)
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

  it("should return two accounts by auth descriptor id when auth descriptor is attached to two accounts", async () => {
    const user1 = testUser();
    const user2 = testUser();
    const ft1 = _ft.changeUser(user1);
    const ft2 = _ft.changeUser(user2);

    const account1 = await AccountBuilder.account(ft1).build();
    const account2 = await AccountBuilder.account(ft2).withPoints(1).build();

    await addAuthDescriptorTo(account2, user1, ft2);

    const accounts = await _connection.getAccountsByAuthDescriptorId(
      account1.id
    );

    expect(accounts.length).toEqual(2);
  });

  it("should have only one auth descriptor after calling deleteAllExcluding", async () => {
    const user1 = testUser();
    const user2 = testUser();
    const user3 = testUser();
    const ft = _ft.changeUser(user1);

    const account = await AccountBuilder.account(ft).withPoints(4).build();

    await addAuthDescriptorTo(account, user2, ft);
    await addAuthDescriptorTo(account, user3, ft);

    await ft.account.authDescriptor.deleteAllExcluding(
      user1.authDescriptor.id,
      account.id
    );

    const foundAccount = await _ft.get.account.by.id(account.id);

    expect(foundAccount!.authDescriptors.length).toEqual(1);
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

  it("should be possible for auth descriptor to delete itself without admin flag", async () => {
    const user1 = testUser();
    const ft = _ft.changeUser(user1);

    const account = await AccountBuilder.account(ft).withPoints(4).build();

    const sigProv = pcl.gtx.newSignatureProvider();

    const user2 = {
      signatureProvider: sigProv,
      authDescriptor: authDescriptor.create.singleSig.withArgs(
        [FlagsType.Transfer],
        sigProv.pubKey
      ).andNoRules,
      keyManagers: user1.keyManagers,
    };

    await addAuthDescriptorTo(account, user2, ft);

    const ft2 = _ft.changeUser(user2);

    const promise = ft2.account.authDescriptor.delete(
      user2.authDescriptor.id,
      account.id
    );

    await expect(promise).resolves.not.toThrowError();
    const account2 = await ft.get.account.by.id(account.id);
    expect(account2!.authDescriptors.length).toEqual(1);
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
      ft.get.gtxClient,
      createInMemoryFTKeyStore(keyPair1)
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
      createInMemoryFTKeyStore(keyPair3).createKeyHandler(authDescriptor3);
    const authenticator3 = createAuthenicator(
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
