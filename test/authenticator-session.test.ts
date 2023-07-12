import { Operation, encryption, gtx } from "postchain-client";
import { ftAuth } from "../client/lib/ft4/authentication/ft";
import { op } from "../client/lib/ft4/utils";
import { createInMemoryFtKeyStore } from "../client/lib/ft4/authentication/ft/key-stores/in-memory";
import { createAuthenticator } from "../client/lib/ft4/authentication";
import { createFakeAuthDataService } from "./util/fake-auth-data-service";
import { KeyHandler } from "../client/lib/ft4/authentication/types";
import { createTestAuthDescriptor, opToRellOp } from "./util/util";
import { Buffer } from "buffer";
import { createChromiaClient } from "./util/blockchain-util";
import { TxBuilderTransaction } from "/ft4/utils/types";

describe("Authenticator session", () => {
  it("should insert FT auth operation", async () => {
    const accountId = encryption.randomBytes(32);
    const { keyPair, authDescriptor } = createTestAuthDescriptor();

    const keyHandler =
      createInMemoryFtKeyStore(keyPair).createKeyHandler(authDescriptor);
    const authDataService = createFakeAuthDataService({
      foo: { flags: [], message: "" },
    });
    const authenticatorSession = createAuthenticator(
      accountId,
      [keyHandler],
      authDataService
    ).createSession();

    const operations = await authenticatorSession.authorize(op("foo"));

    expect(operations).toEqual([
      ftAuth(accountId, authDescriptor.id),
      op("foo"),
    ]);
  });

  it("should sign transaction", async () => {
    const accountId = encryption.randomBytes(32);
    const { keyPair, authDescriptor } = createTestAuthDescriptor();
    const client = await createChromiaClient();

    const keyHandler =
      createInMemoryFtKeyStore(keyPair).createKeyHandler(authDescriptor);
    const authDataService = createFakeAuthDataService({
      foo: { flags: [], message: "" },
    });
    const authenticatorSession = createAuthenticator(
      accountId,
      [keyHandler],
      authDataService
    ).createSession();
    const operations: Operation[] = await authenticatorSession.authorize(
      op("foo")
    );

    const transaction: TxBuilderTransaction = {
      blockchainRID: Buffer.from(client.config.blockchainRID, "hex"),
      operations: [],
      signers: authDescriptor.signers,
      signatures: [],
    };
    operations.forEach((operation) =>
      transaction.operations.push(opToRellOp(operation))
    );
    await authenticatorSession.sign(transaction);

    const digestToSign = gtx.getDigestToSign(transaction);
    const signature = encryption.signDigest(digestToSign, keyPair.privKey);

    expect(transaction.signatures).toEqual([signature]);
  });

  it("should use key handler that satisfies operation auth requirements", async () => {
    const accountId = encryption.randomBytes(32);
    const { keyPair: keyPair1, authDescriptor: authDescriptor1 } =
      createTestAuthDescriptor(["b"]);
    const { keyPair: keyPair2, authDescriptor: authDescriptor2 } =
      createTestAuthDescriptor(["f"]);

    const keyHandler1 =
      createInMemoryFtKeyStore(keyPair1).createKeyHandler(authDescriptor1);
    const keyHandler2 =
      createInMemoryFtKeyStore(keyPair2).createKeyHandler(authDescriptor2);

    const authDataService = createFakeAuthDataService({
      foo: { flags: ["f"], message: "" },
    });
    const authenticator = createAuthenticator(
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
      createInMemoryFtKeyStore(keyPair1).createKeyHandler(authDescriptor1);
    const keyHandler2 =
      createInMemoryFtKeyStore(keyPair2).createKeyHandler(authDescriptor2);
    const keyHandler3 =
      createInMemoryFtKeyStore(keyPair3).createKeyHandler(authDescriptor3);

    const authDataService = createFakeAuthDataService({
      foo: { flags: ["f"], message: "" },
      bar: { flags: ["a"], message: "" },
    });

    const authenticatorSession = createAuthenticator(
      accountId,
      [keyHandler1, keyHandler2, keyHandler3],
      authDataService
    ).createSession();

    await authenticatorSession.authorize(op("bar"));
    await authenticatorSession.authorize(op("foo"));

    const usedKeyHandlers = authenticatorSession.getUsedKeyHandlers();

    expect(usedKeyHandlers).toEqual(
      new Set<KeyHandler>([keyHandler2, keyHandler3])
    );
  });

  it("should throw an error when there is no key handler that satisfies operation auth requirements", async () => {
    const accountId = encryption.randomBytes(32);
    const { keyPair, authDescriptor } = createTestAuthDescriptor(["a"]);

    const keyHandler =
      createInMemoryFtKeyStore(keyPair).createKeyHandler(authDescriptor);
    const authDataService = createFakeAuthDataService({
      foo: { flags: ["b"], message: "" },
    });
    const authenticatorSession = createAuthenticator(
      accountId,
      [keyHandler],
      authDataService
    ).createSession();

    await expect(
      authenticatorSession.authorize(op("foo"))
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
      createInMemoryFtKeyStore(keyPair1).createKeyHandler(authDescriptor1);
    const keyHandler2 =
      createInMemoryFtKeyStore(keyPair2).createKeyHandler(authDescriptor2);
    const keyHandler3 =
      createInMemoryFtKeyStore(keyPair3).createKeyHandler(authDescriptor3);

    const authDataService = createFakeAuthDataService({
      foo: { flags: ["f"], message: "" },
      bar: { flags: ["b"], message: "" },
    });

    const authenticatorSession = createAuthenticator(
      accountId,
      [keyHandler1, keyHandler2, keyHandler3],
      authDataService
    ).createSession();

    await authenticatorSession.authorize(op("foo"));
    await authenticatorSession.authorize(op("bar"));

    const signers = authenticatorSession.getSigners();

    expect(signers).toEqual(
      new Set<Buffer>([
        ...keyHandler2.authDescriptor.signers,
        ...keyHandler3.authDescriptor.signers,
      ])
    );
  });
});
