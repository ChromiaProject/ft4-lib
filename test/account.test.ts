import { Account, FlagsType } from "../client/lib/ft3/user/account";
import * as pcl from "postchain-client";
import { buffToHex, KeyPair } from "../client/lib/cyptoUtils";
import TestUser from "./util/test-user";
import SingleSignatureAuthDescriptor from "../client/lib/ft3/user/auth-descriptor/single-signature-auth-descriptor";
import MultiSignatureAuthDescriptor from "../client/lib/ft3/user/auth-descriptor/multi-signature-auth-descriptor";
import AccountBuilder from "./util/account-builder";
import BlockchainUtil from "./util/blockchain-util";
import Blockchain from "../client/lib/ft3/core/blockchain/blockchain";
import { addAuthDescriptor, op } from "../client/lib/ft3";
import User from "../client/lib/ft3/user/user";
import { register } from "../client/lib/ft3/user/account-dev-operations";

async function addAuthDescriptorTo(
  account: Account,
  adminUser: User,
  user: User,
  blockchain: Blockchain
) {
  await blockchain
    .transactionBuilder()
    .add(
      addAuthDescriptor(
        account.id,
        adminUser.authDescriptor.id,
        user.authDescriptor
      )
    )
    .build(
      [adminUser.authDescriptor.signers, user.authDescriptor.signers].flat()
    )
    .sign(adminUser.keyPair)
    .sign(user.keyPair)
    .post();
}

require("dotenv").config(); /*I don't know how to fix if it needs to be fixed*/ // eslint-disable-line @typescript-eslint/no-var-requires

let blockchain: Blockchain = null;

describe("Test the account", () => {
  beforeAll(async () => {
    blockchain = await BlockchainUtil.getDefaultBlockchain();
  });

  it("should be in DEV mode", () => {
    expect(process.env.TEST_DEV || "true").toBe("true");
  });

  it("Correctly creates keypair from string", () => {
    const keyPairToImport = pcl.util.makeKeyPair();
    const user = new KeyPair(buffToHex(keyPairToImport.privKey));
    expect(user.privKey).toEqual(keyPairToImport.privKey);
    expect(user.pubKey).toEqual(keyPairToImport.pubKey);
  });

  it("Correctly creates keypair from buffer", () => {
    const keyPairToImport = pcl.util.makeKeyPair();
    const user = new KeyPair(keyPairToImport.privKey);
    expect(user.privKey).toEqual(keyPairToImport.privKey);
    expect(user.pubKey).toEqual(keyPairToImport.pubKey);
  });

  it("Register account on blockchain", async () => {
    const user = TestUser.singleSig();
    const authDescriptor = new SingleSignatureAuthDescriptor(
      user.keyPair.pubKey,
      [FlagsType.Account, FlagsType.Transfer]
    );

    const account = await Account.register(
      authDescriptor,
      blockchain.newSession(user)
    );

    expect(account).not.toBeNull();
  });

  it("can add new auth descriptor if has account edit rights", async () => {
    const user = TestUser.singleSig();
    const account = await AccountBuilder.account(blockchain, user)
      .withParticipants([user.keyPair])
      .withPoints(1)
      .build();

    expect(account).not.toBeNull();

    await account.addAuthDescriptor(
      new SingleSignatureAuthDescriptor(user.keyPair.pubKey, [
        FlagsType.Transfer,
      ])
    );
    expect(account.authDescriptor.length).toBe(2);
  });

  it("cannot add new auth descriptor if account doesn't have account edit rights", async () => {
    const user = TestUser.singleSig();
    const account = await Account.register(
      new SingleSignatureAuthDescriptor(user.keyPair.pubKey, [
        FlagsType.Transfer,
      ]),
      blockchain.newSession(user)
    );
    expect(account).not.toBeNull();

    const promise = account.addAuthDescriptor(
      new SingleSignatureAuthDescriptor(user.keyPair.pubKey, [
        FlagsType.Transfer,
      ])
    );
    await expect(promise).rejects.toBeInstanceOf(Error);
    expect(account.authDescriptor.length).toBe(1);
  });

  it("should create new multisig account", async () => {
    const user1 = TestUser.singleSig();
    const user2 = TestUser.singleSig();

    const authDescriptor = new MultiSignatureAuthDescriptor(
      [user1.keyPair.pubKey, user2.keyPair.pubKey],
      2,
      [FlagsType.Account, FlagsType.Transfer]
    );

    const promise = blockchain
      .transactionBuilder()
      .add(register(authDescriptor))
      .build(authDescriptor.signers)
      .sign(user1.keyPair)
      .sign(user2.keyPair)
      .post();

    await expect(promise).resolves.not.toThrowError();
  });

  it("should update account if 2 signatures provided", async () => {
    const keyPair1 = new KeyPair();
    const keyPair2 = new KeyPair();
    const keyPair3 = new KeyPair();

    const authDescriptor = new MultiSignatureAuthDescriptor(
      [keyPair1.pubKey, keyPair2.pubKey],
      2,
      [FlagsType.Account, FlagsType.Transfer]
    );

    const user1 = new User(keyPair1, authDescriptor);

    await blockchain
      .transactionBuilder()
      .add(register(authDescriptor))
      .build(authDescriptor.signers)
      .sign(user1.keyPair)
      .sign(keyPair2)
      .post();

    const account = await blockchain
      .newSession(user1)
      .getAccountById(authDescriptor.id);

    const tx = account.tx.addAuthDescriptor(
      new SingleSignatureAuthDescriptor(keyPair3.pubKey, [FlagsType.Transfer])
    );

    await tx.sign(keyPair2).sign(keyPair3).post();

    await account.sync();

    expect(account.authDescriptor.length).toBe(2);
  });

  it("should fail if only one signature provided", async () => {
    const user1 = TestUser.singleSig();
    const user2 = TestUser.singleSig();

    const authDescriptor = new MultiSignatureAuthDescriptor(
      [user1.keyPair.pubKey, user2.keyPair.pubKey],
      2,
      [FlagsType.Account, FlagsType.Transfer]
    );

    await blockchain
      .transactionBuilder()
      .add(register(authDescriptor))
      .build(authDescriptor.signers)
      .sign(user1.keyPair)
      .sign(user2.keyPair)
      .post();

    const account = await blockchain
      .newSession(user1)
      .getAccountById(authDescriptor.id);

    const promise = account.addAuthDescriptor(
      new SingleSignatureAuthDescriptor(user1.keyPair.pubKey, [
        FlagsType.Transfer,
      ])
    );
    await expect(promise).rejects.toBeInstanceOf(Error);
    expect(account.authDescriptor.length).toBe(1);
  });

  it("should be returned when queried by participant id", async () => {
    const user = TestUser.singleSig();

    await AccountBuilder.account(blockchain, user)
      .withParticipants([user.keyPair])
      .build();

    const accounts = await Account.getByParticipantId(
      user.keyPair.pubKey,
      blockchain.newSession(user)
    );

    expect(accounts.length).toEqual(1);
  });

  it("should return two accounts when account is participant of two accounts", async () => {
    const user1 = TestUser.singleSig();
    const user2 = TestUser.singleSig();

    await AccountBuilder.account(blockchain, user1)
      .withParticipants([user1.keyPair])
      .build();

    const account2 = await AccountBuilder.account(blockchain, user2)
      .withParticipants([user2.keyPair])
      .withPoints(1)
      .build();

    await addAuthDescriptorTo(account2, user2, user1, blockchain);

    const accounts = await Account.getByParticipantId(
      user1.keyPair.pubKey,
      blockchain.newSession(user1)
    );

    expect(accounts.length).toEqual(2);
  });

  it("should return account by id", async () => {
    const user = TestUser.singleSig();

    const account = await AccountBuilder.account(blockchain, user).build();

    const foundAccount = await Account.getById(
      account.id_,
      blockchain.newSession(user)
    );

    expect(account).toEqual(foundAccount);
  });

  it("should have only one auth descriptor after calling deleteAllAuthDescriptorsExclude", async () => {
    const user1 = TestUser.singleSig();
    const user2 = TestUser.singleSig();
    const user3 = TestUser.singleSig();

    const account = await AccountBuilder.account(blockchain, user1)
      .withParticipants([user1.keyPair])
      .withPoints(4)
      .build();

    await addAuthDescriptorTo(account, user1, user2, blockchain);
    await addAuthDescriptorTo(account, user1, user3, blockchain);

    await account.deleteAllAuthDescriptorsExclude(user1.authDescriptor);

    const foundAccount = await blockchain
      .newSession(user1)
      .getAccountById(account.id_);

    expect(foundAccount.authDescriptor.length).toEqual(1);
  });

  it("should be able to register account by directly calling 'register_account' operation", async () => {
    const user = TestUser.singleSig();

    await blockchain.call(
      op("ft3.dev_register_account", user.authDescriptor),
      user
    );

    const session = blockchain.newSession(user);
    const account = await session.getAccountById(user.authDescriptor.id);

    expect(account).not.toBeNull();
  });

  it("should be possible for auth descriptor to delete itself without admin flag", async () => {
    const user1 = TestUser.singleSig();

    const account = await AccountBuilder.account(blockchain, user1)
      .withParticipants([user1.keyPair])
      .withPoints(4)
      .build();

    const keyPair = new KeyPair();
    const user2 = new User(
      keyPair,
      new SingleSignatureAuthDescriptor(keyPair.pubKey, [FlagsType.Transfer])
    );

    await addAuthDescriptorTo(account, user1, user2, blockchain);

    const account2 = await blockchain
      .newSession(user2)
      .getAccountById(account.id);

    const promise = account2.deleteAuthDescriptor(user2.authDescriptor);

    await expect(promise).resolves.not.toThrowError();
    await account2.sync();
    expect(account2.authDescriptor.length).toEqual(1);
  });

  it("shouldn't be possible for auth descriptor to delete other auth descriptor without admin flag", async () => {
    const user1 = TestUser.singleSig();

    const account = await AccountBuilder.account(blockchain, user1)
      .withParticipants([user1.keyPair])
      .withPoints(4)
      .build();

    const keyPair2 = new KeyPair();
    const user2 = new User(
      keyPair2,
      new SingleSignatureAuthDescriptor(keyPair2.pubKey, [FlagsType.Transfer])
    );

    const keyPair3 = new KeyPair();
    const user3 = new User(
      keyPair3,
      new SingleSignatureAuthDescriptor(keyPair3.pubKey, [FlagsType.Transfer])
    );

    await addAuthDescriptorTo(account, user1, user2, blockchain);
    await addAuthDescriptorTo(account, user1, user3, blockchain);

    const account2 = await blockchain
      .newSession(user3)
      .getAccountById(account.id);

    const promise = account2.deleteAuthDescriptor(user2.authDescriptor);

    await expect(promise).rejects.toThrowError();
  });
});
