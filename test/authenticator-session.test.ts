import { encryption } from "postchain-client";
import { ftAuth } from "../client/lib/ft4/authentication/ft";
import { _op } from "../client/lib/ft4/utils";
import { createInMemoryFTKeyStore } from "../client/lib/ft4/authentication/ft/key-stores/in-memory";
import { createClient } from "./util/blockchain-util";
import { createAuthenticator } from "../client/lib/ft4/authentication";
import { createFakeAuthDataService } from "./util/fake-auth-data-service";
import { KeyHandler } from "../client/lib/ft4/authentication/interfaces";
import { createTestAuthDescriptor, toNewTx } from "./util/util";
import { Buffer } from "buffer";
import { Operation as OldOperation } from "/ft4/utils/types";

describe("Authenticator session", () => {
  it("should insert FT auth operation", async () => {
    const accountId = encryption.randomBytes(32);
    const { keyPair, authDescriptor } = createTestAuthDescriptor();

    const keyHandler =
      createInMemoryFTKeyStore(keyPair).createKeyHandler(authDescriptor);
    const authDataService = createFakeAuthDataService({
      foo: { flags: [], message: "" },
    });
    const authenticatorSession = createAuthenticator(
      accountId,
      [keyHandler],
      authDataService
    ).createSession();

    const operations = await authenticatorSession.authenticate(_op("foo"));

    expect(operations).toEqual([
      ftAuth(accountId, authDescriptor.id),
      _op("foo"),
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
    const authenticatorSession = createAuthenticator(
      accountId,
      [keyHandler],
      authDataService
    ).createSession();
    const operations: OldOperation[] = (
      await authenticatorSession.authenticate(_op("foo"))
    ).map((op) => [op.name, ...(op.args ?? [])]);

    const client = await createClient();
    const transaction = client.newTransaction(authDescriptor.signers);
    operations.forEach((operation) => transaction.addOperation(...operation));
    const newTx = toNewTx(transaction);
    await authenticatorSession.sign(newTx);

    const digestToSign = transaction.getDigestToSign();
    const signature = encryption.signDigest(digestToSign, keyPair.privKey);

    expect(newTx.signatures).toEqual([signature]);
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
    const authenticator = createAuthenticator(
      accountId,
      [keyHandler1, keyHandler2],
      authDataService
    );
    const keyHandler = await authenticator.getKeyHandlerForOperation(
      _op("foo")
    );

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

    const authenticatorSession = createAuthenticator(
      accountId,
      [keyHandler1, keyHandler2, keyHandler3],
      authDataService
    ).createSession();

    await authenticatorSession.authenticate(_op("bar"));
    await authenticatorSession.authenticate(_op("foo"));

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
    const authenticatorSession = createAuthenticator(
      accountId,
      [keyHandler],
      authDataService
    ).createSession();

    await expect(
      authenticatorSession.authenticate(_op("foo"))
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

    const authenticatorSession = createAuthenticator(
      accountId,
      [keyHandler1, keyHandler2, keyHandler3],
      authDataService
    ).createSession();

    await authenticatorSession.authenticate(_op("foo"));
    await authenticatorSession.authenticate(_op("bar"));

    const signers = authenticatorSession.getSigners();

    expect(signers).toEqual(
      new Set<Buffer>([
        ...keyHandler2.authDescriptor.signers,
        ...keyHandler3.authDescriptor.signers,
      ])
    );
  });
});
