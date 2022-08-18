import { FlagsType } from "../client/lib/ft3/user/account-utils";
import StaticAccount from "../client/lib/ft3/user/static-account";
import MutableAccount from "../client/lib/ft3/user/mutable-account";
import TestUser from "./util/test-user";
import SingleSignatureAuthDescriptor from "../client/lib/ft3/user/auth-descriptor/single-signature-auth-descriptor";
import AccountBuilder from "./util/account-builder";
import BlockchainUtil from "./util/blockchain-util";
import Blockchain from "../client/lib/ft3/core/blockchain/blockchain";
import { op } from "../client/lib/ft3";

let blockchain: Blockchain;

describe("Test the static account", () => {
  beforeAll(async () => {
    blockchain = await BlockchainUtil.getDefaultBlockchain();
  });

  it("should return account by id", async () => {
    const user = TestUser.singleSig();

    const account = await AccountBuilder.account(
      blockchain,
      user
    ).buildStatic();

    const foundAccount = await StaticAccount.getById(account.id, blockchain);

    expect(account).toEqual(foundAccount);
  });

  it("should register account on blockchain", async () => {
    const user = TestUser.singleSig();
    const authDescriptor = new SingleSignatureAuthDescriptor(
      user.signatureProvider.pubKey,
      [FlagsType.Account, FlagsType.Transfer]
    );

    const account = await StaticAccount.register(
      authDescriptor,
      blockchain.newSession(user)
    );

    expect(account).not.toBeNull();
  });

  it("should be able to register account by directly calling 'register_account' operation", async () => {
    const user = TestUser.singleSig();

    await blockchain.call(
      op("ft3.dev_register_account", user.authDescriptor),
      user
    );

    const account = await blockchain.getAccountById(user.authDescriptor.id);

    expect(account).not.toBeNull();
  });

  it("should return mutable account", async () => {
    const user = TestUser.singleSig();

    const account = await AccountBuilder.account(
      blockchain,
      user
    ).buildStatic();

    const foundAccount = await MutableAccount.getById(
      account.id,
      blockchain.newSession(user)
    );

    const mutable = await account.mutable(user);

    expect(mutable).toEqual(foundAccount);
  });
});
