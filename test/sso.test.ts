import Blockchain from "../client/lib/ft3/core/blockchain/blockchain";
import BlockchainUtil from "./util/blockchain-util";
import TestUser from "./util/test-user";
import User from "../client/lib/ft3/user/user";
import { BasicSignatureProvider } from "../client/lib/ft3/user/signature-provider";
import SingleSignatureAuthDescriptor from "../client/lib/ft3/user/auth-descriptor/single-signature-auth-descriptor";
import { Account, addAuthDescriptor, FlagsType, nop } from "../client/lib/ft3";
import SSO from "../client/lib/ft3/user/sso/sso";
import RateLimit from "../client/lib/ft3/user/rate-limit";
import { register } from "../client/lib/ft3/user/account-dev-operations";

let blockchain: Blockchain = null;

function createUser(): User {
  const signatureProvider = new BasicSignatureProvider();

  return new User(
    signatureProvider,
    new SingleSignatureAuthDescriptor(signatureProvider.pubKey, [
      FlagsType.Transfer,
    ])
  );
}

describe("SSO", () => {
  beforeAll(async () => {
    blockchain = await BlockchainUtil.getDefaultBlockchain();
  });

  it("should create account", async () => {
    const vaultUser = TestUser.singleSig();
    const dappUser = createUser();

    const rawTransaction = await Account.rawTransactionRegister(
      vaultUser,
      dappUser.authDescriptor,
      blockchain
    );

    const sso = new SSO(blockchain, dappUser.signatureProvider);

    const [account, user] = await sso.finalizeLogin(
      rawTransaction.toString("hex")
    );

    expect(account.id).toEqual(vaultUser.authDescriptor.id);
    expect(user).toEqual(dappUser);
  });

  it("should add auth descriptor", async () => {
    const vaultUser = TestUser.singleSig();
    const dappUser = createUser();

    const rawTransaction = await Account.rawTransactionRegister(
      vaultUser,
      dappUser.authDescriptor,
      blockchain
    );

    const sso = new SSO(blockchain, dappUser.signatureProvider);
    await sso.finalizeLogin(rawTransaction.toString("hex"));

    await RateLimit.givePoints(vaultUser.authDescriptor.id, 1, blockchain);

    const dappUser2 = createUser();
    const rawTransaction2 = await Account.rawTransactionAddAuthDescriptor(
      vaultUser.authDescriptor.id,
      vaultUser,
      dappUser2.authDescriptor,
      blockchain
    );

    const sso2 = new SSO(blockchain, dappUser2.signatureProvider);
    const [account] = await sso2.finalizeLogin(rawTransaction2.toString("hex"));

    expect(account.authDescriptor.length).toEqual(3);
  });

  it("should throw an error if key pair cannot be found", async () => {
    const vaultUser = TestUser.singleSig();
    const dappUser = createUser();

    const rawTransaction = await Account.rawTransactionRegister(
      vaultUser,
      dappUser.authDescriptor,
      blockchain
    );

    const sso = new SSO(blockchain);
    const promise = sso.finalizeLogin(rawTransaction.toString("hex"));

    await expect(promise).rejects.toThrowError("Error loading public key");
  });

  it("should throw an error if transaction is not signed by dapp key pair", async () => {
    const vaultUser = TestUser.singleSig();
    const dappUser = createUser();

    const rawTransaction = await Account.rawTransactionRegister(
      vaultUser,
      dappUser.authDescriptor,
      blockchain
    );

    const promise = blockchain.postRaw(rawTransaction);
    await expect(promise).rejects.toThrowError();
  });

  it("should throw an error transaction has more than 2 operations", async () => {
    const vaultUser = TestUser.singleSig();
    const dappUser = createUser();

    const tx = await blockchain
      .transactionBuilder()
      .add(register(vaultUser.authDescriptor))
      .add(
        addAuthDescriptor(
          vaultUser.authDescriptor.id,
          vaultUser.authDescriptor.id,
          dappUser.authDescriptor
        )
      )
      .add(nop())
      .build(
        [
          vaultUser.authDescriptor.signers,
          dappUser.authDescriptor.signers,
        ].flat()
      )
      .sign(vaultUser.signatureProvider);
    const rawTransaction = tx.raw();

    const sso = new SSO(blockchain, dappUser.signatureProvider);
    const promise = sso.finalizeLogin(rawTransaction.toString("hex"));

    await expect(promise).rejects.toThrowError("Invalid operation count");
  });

  it("should throw an error if transaction doesn't have operations", async () => {
    const vaultUser = TestUser.singleSig();
    const dappUser = createUser();

    const tx = await blockchain
      .transactionBuilder()
      .build(
        [
          vaultUser.authDescriptor.signers,
          dappUser.authDescriptor.signers,
        ].flat()
      )
      .sign(vaultUser.signatureProvider);
    const rawTransaction = tx.raw();

    const sso = new SSO(blockchain, dappUser.signatureProvider);
    const promise = sso.finalizeLogin(rawTransaction.toString("hex"));

    await expect(promise).rejects.toThrowError("Invalid operation count");
  });

  it("should auto-login if accountId and keyPair are saved", async () => {
    const vaultUser = TestUser.singleSig();
    const dappUser = createUser();

    const rawTransaction = await Account.rawTransactionRegister(
      vaultUser,
      dappUser.authDescriptor,
      blockchain
    );

    const sso = new SSO(blockchain, dappUser.signatureProvider);
    sso.accountId = vaultUser.authDescriptor.id;

    await sso.finalizeLogin(rawTransaction.toString("hex"));

    const [account, user] = await sso.autoLogin();

    expect(account.id).toEqual(vaultUser.authDescriptor.id);
    expect(user).toEqual(dappUser);
  });

  it("should throw an error if there is one operation and it isn't add_auth_descriptor", async () => {
    const vaultUser = TestUser.singleSig();
    const dappUser = createUser();

    const tx = await blockchain
      .transactionBuilder()
      .add(nop())
      .build(
        [
          vaultUser.authDescriptor.signers,
          dappUser.authDescriptor.signers,
        ].flat()
      )
      .sign(vaultUser.signatureProvider);
    const rawTransaction = tx.raw();

    const sso = new SSO(blockchain, dappUser.signatureProvider);
    const promise = sso.finalizeLogin(rawTransaction.toString("hex"));

    await expect(promise).rejects.toThrowError(
      "Expected 'ft3.add_auth_descriptor'"
    );
  });

  it("should throw an error if there are two operations and first is not register", async () => {
    const vaultUser = TestUser.singleSig();
    const dappUser = createUser();

    const tx = await blockchain
      .transactionBuilder()
      .add(nop())
      .add(nop())
      .build(
        [
          vaultUser.authDescriptor.signers,
          dappUser.authDescriptor.signers,
        ].flat()
      )
      .sign(vaultUser.signatureProvider);
    const rawTransaction = tx.raw();

    const sso = new SSO(blockchain, dappUser.signatureProvider);
    const promise = sso.finalizeLogin(rawTransaction.toString("hex"));

    await expect(promise).rejects.toThrowError(
      "Expected 'ft3.dev_register_account'"
    );
  });

  it("should throw an error if there are two operations and second is not add_auth_descriptor", async () => {
    const vaultUser = TestUser.singleSig();
    const dappUser = createUser();

    const tx = await blockchain
      .transactionBuilder()
      .add(register(vaultUser.authDescriptor))
      .add(nop())
      .build(
        [
          vaultUser.authDescriptor.signers,
          dappUser.authDescriptor.signers,
        ].flat()
      )
      .sign(vaultUser.signatureProvider);
    const rawTransaction = tx.raw();

    const sso = new SSO(blockchain, dappUser.signatureProvider);
    const promise = sso.finalizeLogin(rawTransaction.toString("hex"));

    await expect(promise).rejects.toThrowError(
      "Expected 'ft3.add_auth_descriptor'"
    );
  });
});
