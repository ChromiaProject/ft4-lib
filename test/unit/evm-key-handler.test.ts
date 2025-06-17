import {
  createFakeAuthDataService,
  testAdFromRegistration,
} from "@ft4-test/util";
import {
  AuthFlag,
  createMultiSigAuthDescriptorRegistration,
  createSingleSigAuthDescriptorRegistration,
  deriveAuthDescriptorId,
} from "@ft4/accounts";
import {
  createAuthenticator,
  createEvmKeyHandler,
  createInMemoryEvmKeyStore,
  evmAuth,
} from "@ft4/authentication";
import { transactionBuilder } from "@ft4/transaction-builder";
import { deriveNonce, op } from "@ft4/utils";
import { Buffer } from "buffer";
import { ethers } from "ethers";
import { IClient, createStubClient, encryption, gtx } from "postchain-client";

describe("EVM key handler", () => {
  let client: IClient;

  beforeAll(async () => {
    client = await createStubClient();
  });

  const keyPair = encryption.makeKeyPair(
    "9b26feb211a3f9ef27b2f23bac7264e68f68916f6e32216396945db28011e00f",
  );
  const message = "Sign this message with {nonce}";

  const accountId = encryption.randomBytes(32);
  const keyStore = createInMemoryEvmKeyStore(keyPair);
  const ad = createSingleSigAuthDescriptorRegistration(
    [AuthFlag.Transfer],
    keyStore.address,
    null,
  );
  const authService = createFakeAuthDataService({
    foo: { flags: [AuthFlag.Transfer], message },
  });

  it("signs a message", async () => {
    const message = "Message to sign";
    const rawSignature = Buffer.from(
      "7adaca211cb044ebc4b3f8b9342438102102e50ad7850c13c78237145f8751374cbb38fd4e0a68da31ac51fcb2280316b58337561f322e717682699fd53958ff1b",
      "hex",
    );

    const expectedSignature = {
      r: rawSignature.subarray(0, 32),
      s: rawSignature.subarray(32, 64),
      v: 27,
    };

    const signedMessage =
      await createInMemoryEvmKeyStore(keyPair).signMessage(message);

    expect(signedMessage).toEqual(expectedSignature);
  });

  it("should insert evm_auth operation", async () => {
    const keyHandler = keyStore.createKeyHandler(testAdFromRegistration(ad));
    const authData = {
      flags: [],
      message: "Message to sign",
    };

    const operations = await keyHandler.authorize(
      accountId,
      op("foo"),
      {},
      createFakeAuthDataService({
        foo: authData,
      }),
    );

    const signature = await keyStore.signMessage(authData.message);
    expect(operations).toEqual([
      evmAuth(accountId, deriveAuthDescriptorId(ad), [signature]),
      op("foo"),
    ]);
  });

  it("increments local auth descriptor counter", async () => {
    const authenticator = createAuthenticator(
      accountId,
      [keyStore.createKeyHandler(testAdFromRegistration(ad))],
      authService,
    );

    const signature1 = await keyStore.signMessage(
      message.replace(
        "{nonce}",
        deriveNonce(Buffer.alloc(32), op("foo"), 0, 1),
      ),
    );
    const signature2 = await keyStore.signMessage(
      message.replace(
        "{nonce}",
        deriveNonce(Buffer.alloc(32), op("foo"), 1, 1),
      ),
    );

    const tx = await transactionBuilder(authenticator, client)
      .add(op("foo"))
      .add(op("foo"))
      .build();

    expect(gtx.deserialize(tx).operations).toEqual([
      {
        opName: "ft4.evm_auth",
        args: [
          accountId,
          deriveAuthDescriptorId(ad),
          [[signature1.r, signature1.s, signature1.v]],
        ],
      },
      {
        opName: "foo",
        args: [],
      },
      {
        opName: "ft4.evm_auth",
        args: [
          accountId,
          deriveAuthDescriptorId(ad),
          [[signature2.r, signature2.s, signature2.v]],
        ],
      },
      {
        opName: "foo",
        args: [],
      },
    ]);
  });

  it("resets local auth descriptor counter between transactions if transaction is not submitted", async () => {
    authService.getAuthDescriptorCounter = () => Promise.resolve(0);
    const authenticator = createAuthenticator(
      accountId,
      [keyStore.createKeyHandler(testAdFromRegistration(ad))],
      authService,
    );

    const signature1 = await keyStore.signMessage(
      message.replace(
        "{nonce}",
        deriveNonce(Buffer.alloc(32), op("foo"), 0, 1),
      ),
    );
    const signature2 = await keyStore.signMessage(
      message.replace(
        "{nonce}",
        deriveNonce(Buffer.alloc(32), op("foo"), 1, 1),
      ),
    );

    await transactionBuilder(authenticator, client)
      .add(op("foo"))
      .add(op("foo"))
      .build();

    const tx2 = await transactionBuilder(authenticator, client)
      .add(op("foo"))
      .add(op("foo"))
      .build();

    const adId = deriveAuthDescriptorId(ad);
    expect(gtx.deserialize(tx2).operations).toEqual([
      {
        opName: "ft4.evm_auth",
        args: [accountId, adId, [[signature1.r, signature1.s, signature1.v]]],
      },
      {
        opName: "foo",
        args: [],
      },
      {
        opName: "ft4.evm_auth",
        args: [accountId, adId, [[signature2.r, signature2.s, signature2.v]]],
      },
      {
        opName: "foo",
        args: [],
      },
    ]);
  });

  it("resets local auth descriptor counter if user rejects metamask signature", async () => {
    // Rewire the keystore to let us fake a user rejection on first call
    const oldSignFunc = keyStore.signMessage;
    const signMessage = jest
      .fn()
      .mockImplementationOnce(() => {
        const err = new Error() as ethers.EthersError;
        err.code = "ACTION_REJECTED";
        throw err;
      })
      .mockImplementation((msg: string) => oldSignFunc(msg));
    const mockKeyStore = { ...keyStore, signMessage };

    authService.getAuthDescriptorCounter = () => Promise.resolve(0);
    const authenticator = createAuthenticator(
      accountId,
      [createEvmKeyHandler(testAdFromRegistration(ad), mockKeyStore)],
      authService,
    );

    await expect(
      transactionBuilder(authenticator, client)
        .add(op("foo"))
        .add(op("foo"))
        .build(),
    ).rejects.toThrow(Error);

    const signature1 = await mockKeyStore.signMessage(
      message.replace(
        "{nonce}",
        deriveNonce(Buffer.alloc(32), op("foo"), 0, 1),
      ),
    );
    const signature2 = await mockKeyStore.signMessage(
      message.replace(
        "{nonce}",
        deriveNonce(Buffer.alloc(32), op("foo"), 1, 1),
      ),
    );

    const tx2 = await transactionBuilder(authenticator, client)
      .add(op("foo"))
      .add(op("foo"))
      .build();

    const adId = deriveAuthDescriptorId(ad);
    expect(gtx.deserialize(tx2).operations).toEqual([
      {
        opName: "ft4.evm_auth",
        args: [accountId, adId, [[signature1.r, signature1.s, signature1.v]]],
      },
      {
        opName: "foo",
        args: [],
      },
      {
        opName: "ft4.evm_auth",
        args: [accountId, adId, [[signature2.r, signature2.s, signature2.v]]],
      },
      {
        opName: "foo",
        args: [],
      },
    ]);
  });

  it("populates signatures array with null for empty fields", async () => {
    const keyPair1 = encryption.makeKeyPair();
    const keyPair2 = encryption.makeKeyPair();
    const keyStore1 = createInMemoryEvmKeyStore(keyPair1);
    const keyStore2 = createInMemoryEvmKeyStore(keyPair2);
    const signature = { r: Buffer.from("r"), s: Buffer.from("s"), v: 27 };

    const fakeKeyStore = {
      ...keyStore1,
      signMessage: jest.fn().mockResolvedValue(signature),
    };

    const ad = createMultiSigAuthDescriptorRegistration(
      [AuthFlag.Transfer],
      [fakeKeyStore.address, keyStore2.address],
      2,
      null,
    );
    const adId = deriveAuthDescriptorId(ad);
    const accountId = adId;
    const authDataService = createFakeAuthDataService({
      foo: { flags: [AuthFlag.Transfer], message: "" },
    });

    const evmKeyHandler = createEvmKeyHandler(
      testAdFromRegistration(ad),
      fakeKeyStore,
    );
    const ops = await evmKeyHandler.authorize(
      accountId,
      op("foo"),
      {},
      authDataService,
    );
    expect(ops).toStrictEqual([
      evmAuth(accountId, adId, [signature, null]),
      op("foo"),
    ]);
  });
});
