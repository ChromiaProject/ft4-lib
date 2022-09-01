import { FlagsType } from "../client/lib/ft3/user/account-utils";
import MutableAccount from "../client/lib/ft3/user/mutable-account";
import * as pcl from "postchain-client";
import { buffToHex, KeyPair } from "../client/lib/cryptoUtils";
import { InMemorySignatureProvider } from "../client/lib/ft3/user/signature-provider";
import TestUser from "./util/test-user";
import SingleSignatureAuthDescriptor from "../client/lib/ft3/user/auth-descriptor/single-signature-auth-descriptor";
import MultiSignatureAuthDescriptor from "../client/lib/ft3/user/auth-descriptor/multi-signature-auth-descriptor";
import AccountBuilder from "./util/account-builder";
import BlockchainUtil from "./util/blockchain-util";
import Blockchain from "../client/lib/ft3/core/blockchain/blockchain";
import { addAuthDescriptor, op } from "../client/lib/ft3";
import User from "../client/lib/ft3/user/user";
import { register } from "../client/lib/ft3/user/account-dev-operations";
import { config } from "dotenv";
config();

async function addAuthDescriptorTo(
  account: MutableAccount,
  adminUser: User,
  user: User,
  blockchain: Blockchain
) {
  let tx = await blockchain
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
    .sign(adminUser.signatureProvider);
  tx = await tx.sign(user.signatureProvider);
  await tx.post();
}

let blockchain: Blockchain;

describe("Test the mutable account", () => {
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
      user.signatureProvider.pubKey,
      [FlagsType.Account, FlagsType.Transfer]
    );

    const account = await MutableAccount.register(
      authDescriptor,
      blockchain.newSession(user)
    );

    expect(account).not.toBeNull();
  });

  it("can add new auth descriptor if has account edit rights", async () => {
    const user = TestUser.singleSig();
    const account = await AccountBuilder.account(blockchain, user)
      .withParticipants([user.signatureProvider])
      .withPoints(1)
      .build();

    expect(account).not.toBeNull();

    await account.addAuthDescriptor(
      new SingleSignatureAuthDescriptor(user.signatureProvider.pubKey, [
        FlagsType.Transfer,
      ])
    );
    expect(account.authDescriptor.length).toBe(2);
  });

  it("cannot add new auth descriptor if account doesn't have account edit rights", async () => {
    const user = TestUser.singleSig();
    const account = await MutableAccount.register(
      new SingleSignatureAuthDescriptor(user.signatureProvider.pubKey, [
        FlagsType.Transfer,
      ]),
      blockchain.newSession(user)
    );
    expect(account).not.toBeNull();

    const promise = account.addAuthDescriptor(
      new SingleSignatureAuthDescriptor(user.signatureProvider.pubKey, [
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
      [user1.signatureProvider.pubKey, user2.signatureProvider.pubKey],
      2,
      [FlagsType.Account, FlagsType.Transfer]
    );

    let tx = await blockchain
      .transactionBuilder()
      .add(register(authDescriptor))
      .build(authDescriptor.signers)
      .sign(user1.signatureProvider);
    tx = await tx.sign(user2.signatureProvider);
    const promise = tx.post();

    await expect(promise).resolves.not.toThrowError();
  });

  it("should update account if 2 signatures provided", async () => {
    const sigProv1 = new InMemorySignatureProvider();
    const sigProv2 = new InMemorySignatureProvider();
    const sigProv3 = new InMemorySignatureProvider();

    const authDescriptor = new MultiSignatureAuthDescriptor(
      [sigProv1.pubKey, sigProv2.pubKey],
      2,
      [FlagsType.Account, FlagsType.Transfer]
    );

    const user1 = new User(sigProv1, authDescriptor);

    let tx = await blockchain
      .transactionBuilder()
      .add(register(authDescriptor))
      .build(authDescriptor.signers)
      .sign(user1.signatureProvider);
    tx = await tx.sign(sigProv2);
    await tx.post();

    const account = await blockchain
      .newSession(user1)
      .getAccountById(authDescriptor.id);

    tx = await account.tx.addAuthDescriptor(
      new SingleSignatureAuthDescriptor(sigProv3.pubKey, [FlagsType.Transfer])
    );

    tx = await tx.sign(sigProv2);
    tx = await tx.sign(sigProv3);
    await tx.post();

    await account.sync();

    expect(account.authDescriptor.length).toBe(2);
  });

  it("should fail if only one signature provided", async () => {
    const user1 = TestUser.singleSig();
    const user2 = TestUser.singleSig();

    const authDescriptor = new MultiSignatureAuthDescriptor(
      [user1.signatureProvider.pubKey, user2.signatureProvider.pubKey],
      2,
      [FlagsType.Account, FlagsType.Transfer]
    );

    let tx = await blockchain
      .transactionBuilder()
      .add(register(authDescriptor))
      .build(authDescriptor.signers)
      .sign(user1.signatureProvider);
    tx = await tx.sign(user2.signatureProvider);
    await tx.post();

    const account = await blockchain
      .newSession(user1)
      .getAccountById(authDescriptor.id);

    const promise = account.addAuthDescriptor(
      new SingleSignatureAuthDescriptor(user1.signatureProvider.pubKey, [
        FlagsType.Transfer,
      ])
    );
    await expect(promise).rejects.toBeInstanceOf(Error);
    expect(account.authDescriptor.length).toBe(1);
  });

  it("should be returned when queried by participant id", async () => {
    const user = TestUser.singleSig();

    await AccountBuilder.account(blockchain, user)
      .withParticipants([user.signatureProvider])
      .build();

    const accounts = await MutableAccount.getByParticipantId(
      user.signatureProvider.pubKey,
      blockchain.newSession(user)
    );

    expect(accounts.length).toEqual(1);
  });

  it("should return two accounts when account is participant of two accounts", async () => {
    const user1 = TestUser.singleSig();
    const user2 = TestUser.singleSig();

    await AccountBuilder.account(blockchain, user1)
      .withParticipants([user1.signatureProvider])
      .build();

    const account2 = await AccountBuilder.account(blockchain, user2)
      .withParticipants([user2.signatureProvider])
      .withPoints(1)
      .build();

    await addAuthDescriptorTo(account2, user2, user1, blockchain);

    const accounts = await MutableAccount.getByParticipantId(
      user1.signatureProvider.pubKey,
      blockchain.newSession(user1)
    );

    expect(accounts.length).toEqual(2);
  });

  it("should return account by id", async () => {
    const user = TestUser.singleSig();

    const account = await AccountBuilder.account(blockchain, user).build();

    const foundAccount = await MutableAccount.getById(
      account.id,
      blockchain.newSession(user)
    );

    expect(account).toEqual(foundAccount);
  });

  it("should have only one auth descriptor after calling deleteAllAuthDescriptorsExclude", async () => {
    const user1 = TestUser.singleSig();
    const user2 = TestUser.singleSig();
    const user3 = TestUser.singleSig();

    const account = await AccountBuilder.account(blockchain, user1)
      .withParticipants([user1.signatureProvider])
      .withPoints(4)
      .build();

    await addAuthDescriptorTo(account, user1, user2, blockchain);
    await addAuthDescriptorTo(account, user1, user3, blockchain);

    await account.deleteAllAuthDescriptorsExclude(user1.authDescriptor);

    const foundAccount = await blockchain
      .newSession(user1)
      .getAccountById(account.id);

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
      .withParticipants([user1.signatureProvider])
      .withPoints(4)
      .build();

    const sigProv = new InMemorySignatureProvider();
    const user2 = new User(
      sigProv,
      new SingleSignatureAuthDescriptor(sigProv.pubKey, [FlagsType.Transfer])
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
      .withParticipants([user1.signatureProvider])
      .withPoints(4)
      .build();

    const sigProv2 = new InMemorySignatureProvider();
    const user2 = new User(
      sigProv2,
      new SingleSignatureAuthDescriptor(sigProv2.pubKey, [FlagsType.Transfer])
    );

    const sigProv3 = new InMemorySignatureProvider();
    const user3 = new User(
      sigProv3,
      new SingleSignatureAuthDescriptor(sigProv3.pubKey, [FlagsType.Transfer])
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
