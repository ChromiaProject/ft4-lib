import { encryption } from "postchain-client";
import { ftAuth } from "../client/lib/ft4/authentication/ft";
import { op } from "../client/lib/ft4/utils";
import { createInMemoryFTKeyStore } from "../client/lib/ft4/authentication/ft/key-stores/in-memory";
import { createClient } from "./util/blockchain-util";
import { createAuthenicator } from "../client/lib/ft4/authentication";
import { createFakeAuthDataService } from "./util/fake-auth-data-service";
import { KeyHandler } from "../client/lib/ft4/authentication/interfaces";
import { createTestAuthDescriptor } from "./util/util";
import { Buffer } from "buffer";

describe("Authenticator session", () => {
  it("should insert FT auth operation", async () => {
    const accountId = encryption.randomBytes(32);
    const { keyPair, authDescriptor } = createTestAuthDescriptor();

    const keyHandler =
      createInMemoryFTKeyStore(keyPair).createKeyHandler(authDescriptor);
    const authDataService = createFakeAuthDataService({
      foo: { flags: [], message: "" },
    });
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
    const { keyPair, authDescriptor } = createTestAuthDescriptor();

    const keyHandler =
      createInMemoryFTKeyStore(keyPair).createKeyHandler(authDescriptor);
    const authDataService = createFakeAuthDataService({
      foo: { flags: [], message: "" },
    });
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

  it("should use key handler that satisfies operation auth requirements", async () => {
    const accountId = encryption.randomBytes(32);
    const { keyPair: keyPair1, authDescriptor: authDescriptor1 } =
      createTestAuthDescriptor(["b"]);
    const { keyPair: keyPair2, authDescriptor: authDescriptor2 } =
      createTestAuthDescriptor(["f"]);

    const keyHandler1 =
      createInMemoryFTKeyStore(keyPair1).createKeyHandler(authDescriptor1);
    const keyHandler2 =
      createInMemoryFTKeyStore(keyPair2).createKeyHandler(authDescriptor2);

    const authDataService = createFakeAuthDataService({
      foo: { flags: ["f"], message: "" },
    });
    const authenticator = createAuthenicator(
      accountId,
      [keyHandler1, keyHandler2],
      authDataService
    );
    const keyHandler = await authenticator.getKeyHandlerForOperation(op("foo"));

    expect(keyHandler.authDescriptor).toEqual(authDescriptor2);
  });

  it("should get list of used key handlers", async () => {
    const accountId = encryption.randomBytes(32);
    const { keyPair: keyPair1, authDescriptor: authDescriptor1 } =
      createTestAuthDescriptor(["b"]);
    const { keyPair: keyPair2, authDescriptor: authDescriptor2 } =
      createTestAuthDescriptor(["f"]);
    const { keyPair: keyPair3, authDescriptor: authDescriptor3 } =
      createTestAuthDescriptor(["a"]);

    const keyHandler1 =
      createInMemoryFTKeyStore(keyPair1).createKeyHandler(authDescriptor1);
    const keyHandler2 =
      createInMemoryFTKeyStore(keyPair2).createKeyHandler(authDescriptor2);
    const keyHandler3 =
      createInMemoryFTKeyStore(keyPair3).createKeyHandler(authDescriptor3);

    const authDataService = createFakeAuthDataService({
      foo: { flags: ["f"], message: "" },
      bar: { flags: ["a"], message: "" },
    });

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

  it("should throw an error when there is no key handler that satisfies operation auth requirements", async () => {
    const accountId = encryption.randomBytes(32);
    const { keyPair, authDescriptor } = createTestAuthDescriptor(["a"]);

    const keyHandler =
      createInMemoryFTKeyStore(keyPair).createKeyHandler(authDescriptor);
    const authDataService = createFakeAuthDataService({
      foo: { flags: ["b"], message: "" },
    });
    const authenticatorSession = createAuthenicator(
      accountId,
      [keyHandler],
      authDataService
    ).createSession();

    await expect(
      authenticatorSession.authenticate(op("foo"))
    ).rejects.toBeInstanceOf(Error);
  });

  it("should get list of signers", async () => {
    const accountId = encryption.randomBytes(32);
    const { keyPair: keyPair1, authDescriptor: authDescriptor1 } =
      createTestAuthDescriptor(["a"]);
    const { keyPair: keyPair2, authDescriptor: authDescriptor2 } =
      createTestAuthDescriptor(["b"]);
    const { keyPair: keyPair3, authDescriptor: authDescriptor3 } =
      createTestAuthDescriptor(["f"]);

    const keyHandler1 =
      createInMemoryFTKeyStore(keyPair1).createKeyHandler(authDescriptor1);
    const keyHandler2 =
      createInMemoryFTKeyStore(keyPair2).createKeyHandler(authDescriptor2);
    const keyHandler3 =
      createInMemoryFTKeyStore(keyPair3).createKeyHandler(authDescriptor3);

    const authDataService = createFakeAuthDataService({
      foo: { flags: ["f"], message: "" },
      bar: { flags: ["b"], message: "" },
    });

    const authenticatorSession = createAuthenicator(
      accountId,
      [keyHandler1, keyHandler2, keyHandler3],
      authDataService
    ).createSession();

    await authenticatorSession.authenticate(op("foo"));
    await authenticatorSession.authenticate(op("bar"));

    const signers = authenticatorSession.getSigners();

    expect(signers).toEqual(
      new Set<Buffer>([
        ...keyHandler2.authDescriptor.signers,
        ...keyHandler3.authDescriptor.signers,
      ])
    );
  });
});
