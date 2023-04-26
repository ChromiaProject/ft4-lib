import { encryption } from "postchain-client";
import {
  createFTKeyHandler,
  ftAuth,
} from "../client/lib/ft3/authentication/ft/key-handler";
import { KeyPair } from "../client/lib/cryptoUtils";
import { op } from "../client/lib/ft3/utils";
import { create } from "../client/lib/ft3/account/auth-descriptor/auth-descriptor";
import { FlagsType } from "../client/lib/ft3/account/auth-descriptor";
import { createInMemoryFTKeyStore } from "../client/lib/ft3/authentication/ft/key-stores/in-memory";
import { createClient } from "./util/blockchain-util";
import { createAuthenicator } from "../client/lib/ft3/authentication";
import { createFakeAuthDataService } from "./util/fake-auth-data-service";
import {
  AuthData,
  KeyHandler,
} from "../client/lib/ft3/authentication/interfaces";

describe("Key handler", () => {
  it("should insert FT auth operation", async () => {
    const accountId = encryption.randomBytes(32);
    const keyPair = new KeyPair();
    const authDescriptor = create.singleSig.withArgs(
      [FlagsType.Account, FlagsType.Transfer],
      keyPair.pubKey
    ).andNoRules;
    const keyHandler = createFTKeyHandler(
      authDescriptor,
      createInMemoryFTKeyStore(keyPair)
    );
    const operations = await keyHandler.authenticate(accountId, op("foo"));

    expect(operations).toEqual([
      ftAuth(accountId, authDescriptor.id),
      op("foo"),
    ]);
  });

  it("should sign transaction", async () => {
    const keyPair = new KeyPair();
    const authDescriptor = create.singleSig.withArgs(
      [FlagsType.Account, FlagsType.Transfer],
      keyPair.pubKey
    ).andNoRules;

    const client = await createClient();
    const transaction = client.newTransaction(authDescriptor.signers);
    transaction.addOperation("foo");

    const keyHandler =
      createInMemoryFTKeyStore(keyPair).createKeyHandler(authDescriptor);
    await keyHandler.sign(transaction);

    const digestToSign = transaction.getDigestToSign();
    const signature = encryption.signDigest(digestToSign, keyPair.privKey);

    expect(transaction.gtx.signatures).toEqual([signature]);
  });
});

describe("Authenticator session", () => {
  it("should insert FT auth operation", async () => {
    const accountId = encryption.randomBytes(32);
    const keyPair = new KeyPair();
    const authDescriptor = create.singleSig.withArgs(
      [FlagsType.Account, FlagsType.Transfer],
      keyPair.pubKey
    ).andNoRules;
    const keyHandler =
      createInMemoryFTKeyStore(keyPair).createKeyHandler(authDescriptor);
    const authDataService = createFakeAuthDataService(
      new Map<string, AuthData>([["foo", { flags: [] }]])
    );
    const authenticatorSession = createAuthenicator(
      accountId,
      [keyHandler],
      authDataService
    ).createSession();
    const operations = await authenticatorSession.authenticate(op("foo"));

    expect(operations).toEqual([
      ftAuth(accountId, authDescriptor.id),
      op("foo"),
    ]);
  });

  it("should sign transaction", async () => {
    const accountId = encryption.randomBytes(32);
    const keyPair = new KeyPair();
    const authDescriptor = create.singleSig.withArgs(
      [FlagsType.Account, FlagsType.Transfer],
      keyPair.pubKey
    ).andNoRules;

    const keyHandler =
      createInMemoryFTKeyStore(keyPair).createKeyHandler(authDescriptor);
    const authDataService = createFakeAuthDataService(
      new Map<string, AuthData>([["foo", { flags: [] }]])
    );
    const authenticatorSession = createAuthenicator(
      accountId,
      [keyHandler],
      authDataService
    ).createSession();
    const operations = await authenticatorSession.authenticate(op("foo"));

    const client = await createClient();
    const transaction = client.newTransaction(authDescriptor.signers);
    operations.forEach((operation) => transaction.addOperation(...operation));
    await authenticatorSession.sign(transaction);

    const digestToSign = transaction.getDigestToSign();
    const signature = encryption.signDigest(digestToSign, keyPair.privKey);

    expect(transaction.gtx.signatures).toEqual([signature]);
  });

  it("should use key handler which satisfies operation auth requirements", async () => {
    const accountId = encryption.randomBytes(32);
    const keyPair1 = new KeyPair();
    const keyPair2 = new KeyPair();
    const authDescriptor1 = create.singleSig.withArgs(
      ["b"],
      keyPair1.pubKey
    ).andNoRules;
    const authDescriptor2 = create.singleSig.withArgs(
      ["f"],
      keyPair2.pubKey
    ).andNoRules;

    const keyHandler1 =
      createInMemoryFTKeyStore(keyPair1).createKeyHandler(authDescriptor1);
    const keyHandler2 =
      createInMemoryFTKeyStore(keyPair2).createKeyHandler(authDescriptor2);

    const authDataService = createFakeAuthDataService(
      new Map<string, AuthData>([["foo", { flags: ["f"] }]])
    );
    const authenticator = createAuthenicator(
      accountId,
      [keyHandler1, keyHandler2],
      authDataService
    );
    const keyHandler = await authenticator.getKeyHandlerForOperation(op("foo"));

    expect(keyHandler.authDescriptor).toEqual(authDescriptor2);
  });

  it("should should get list of used key handlers", async () => {
    const accountId = encryption.randomBytes(32);
    const keyPair1 = new KeyPair();
    const keyPair2 = new KeyPair();
    const keyPair3 = new KeyPair();
    const authDescriptor1 = create.singleSig.withArgs(
      ["b"],
      keyPair1.pubKey
    ).andNoRules;
    const authDescriptor2 = create.singleSig.withArgs(
      ["f"],
      keyPair2.pubKey
    ).andNoRules;
    const authDescriptor3 = create.singleSig.withArgs(
      ["a"],
      keyPair3.pubKey
    ).andNoRules;

    const keyHandler1 =
      createInMemoryFTKeyStore(keyPair1).createKeyHandler(authDescriptor1);
    const keyHandler2 =
      createInMemoryFTKeyStore(keyPair2).createKeyHandler(authDescriptor2);
    const keyHandler3 =
      createInMemoryFTKeyStore(keyPair3).createKeyHandler(authDescriptor3);

    const authDataService = createFakeAuthDataService(
      new Map<string, AuthData>([
        ["foo", { flags: ["f"] }],
        ["bar", { flags: ["a"] }],
      ])
    );
    const authenticatorSession = createAuthenicator(
      accountId,
      [keyHandler1, keyHandler2, keyHandler3],
      authDataService
    ).createSession();

    await authenticatorSession.authenticate(op("bar"));
    await authenticatorSession.authenticate(op("foo"));

    const usedKeyHandlers = authenticatorSession.getUsedKeyHandlers();

    expect(usedKeyHandlers).toEqual(
      new Set<KeyHandler>([keyHandler2, keyHandler3])
    );
  });
});
