import {
  FlagsType,
  MutableAccount,
  SingleSignatureAuthDescriptor,
  MultiSignatureAuthDescriptor,
  Blockchain,
  addAuthDescriptor,
  deleteAllAuthDescriptorsExclude,
  op,
  User,
} from "../client/lib/ft3";
import BlockchainUtil from "./util/blockchain-util";
import { register } from "../client/lib/ft3/user/account-dev-operations";
import AccountBuilder from "./util/account-builder";
import TestUser from "./util/test-user";

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

const POINTS_AT_ACCOUNT_CREATION = 1;
let blockchain: Blockchain;

describe("Test the account", () => {
  beforeAll(async () => {
    blockchain = await BlockchainUtil.getDefaultBlockchain();
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
    await tx.post();

    const account = await MutableAccount.getById(
      authDescriptor.id,
      blockchain.newSession(user1)
    );

    expect(account.id).toEqual(authDescriptor.id);
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

    const account = await MutableAccount.getById(
      authDescriptor.id,
      blockchain.newSession(user1)
    );

    expect(account).not.toBeNull();

    const authDescriptor2 = new SingleSignatureAuthDescriptor(
      user1.signatureProvider.pubKey,
      [FlagsType.Transfer]
    );

    tx = await blockchain
      .transactionBuilder()
      .add(
        addAuthDescriptor(authDescriptor.id, authDescriptor.id, authDescriptor2)
      )
      .build(authDescriptor2.signers)
      .sign(user1.signatureProvider);
    const promise = tx.post();

    await expect(promise).rejects.toBeInstanceOf(Error);
    expect(account.authDescriptor.length).toBe(1);
  });

  it("should have 2 auth descriptor left after calling deleteAllAuthDescriptorsExclude with not the main one", async () => {
    const user1 = TestUser.singleSig();
    const user2 = TestUser.singleSig();
    const user3 = TestUser.singleSig();

    const account = await AccountBuilder.account(blockchain, user1)
      .withParticipants([user1.signatureProvider])
      .withPoints(3 - POINTS_AT_ACCOUNT_CREATION)
      .build();

    await addAuthDescriptorTo(account, user1, user2, blockchain);
    await addAuthDescriptorTo(account, user1, user3, blockchain);

    await blockchain
      .newSession(user2)
      .call(
        deleteAllAuthDescriptorsExclude(
          user1.authDescriptor.id,
          user2.authDescriptor.id
        )
      );

    const foundAccount = await blockchain
      .newSession(user1)
      .getAccountById(account.id);

    expect(foundAccount.authDescriptor.length).toEqual(2);
  });

  it("should not be able to remove main auth descriptor", async () => {
    const user1 = TestUser.singleSig();
    const user2 = TestUser.singleSig();

    const account = await AccountBuilder.account(blockchain, user1)
      .withParticipants([user1.signatureProvider])
      .withPoints(3 - POINTS_AT_ACCOUNT_CREATION)
      .build();

    await addAuthDescriptorTo(account, user1, user2, blockchain);

    const opPromise = account.deleteAuthDescriptor(user1.authDescriptor);
    await expect(opPromise).rejects.toThrow("Transaction was rejected");
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
});
