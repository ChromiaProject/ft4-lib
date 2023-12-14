import { Buffer } from "buffer";
import { EthersError, ethers } from "ethers";
import { IClient, encryption, gtx } from "postchain-client";
import {
  FlagsType,
  createSingleSigAuthDescriptorRegistration,
  deriveAuthDescriptorId,
} from "/ft4/accounts/auth-descriptor";
import { createAuthenticator } from "/ft4/authentication";
import { createEvmKeyHandler, evmAuth } from "/ft4/authentication/evm";
import { createInMemoryEvmKeyStore } from "/ft4/authentication/evm/key-stores/in-memory";
import { op } from "/ft4/utils";
import { transactionBuilder } from "/ft4/utils/transaction-builder";
import { createStubClient } from "/util/blockchain-util";
import { createFakeAuthDataService } from "/util/fake-auth-data-service";
import { testAdFromRegistration } from "/util/util";

describe("EVM key handler", () => {
  let client: IClient;

  beforeAll(async () => {
    client = await createStubClient();
  });

  it("should sign message", async () => {
    const keyPair = encryption.makeKeyPair();
    const message = "Message to sign";

    const walletSignedMessage = await new ethers.Wallet(
      keyPair.privKey.toString("hex"),
    ).signMessage(message);
    const { r, s, v } = ethers.Signature.from(walletSignedMessage);
    const expectedSignature = {
      r: Buffer.from(r.slice(2), "hex"),
      s: Buffer.from(s.slice(2), "hex"),
      v,
    };

    const signedMessage =
      await createInMemoryEvmKeyStore(keyPair).signMessage(message);

    expect(signedMessage).toEqual(expectedSignature);
  });

  it("should insert evm_auth operation", async () => {
    const accountId = encryption.randomBytes(32);
    const keyPair = encryption.makeKeyPair();
    const keyStore = createInMemoryEvmKeyStore(keyPair);
    const ad = createSingleSigAuthDescriptorRegistration(
      [],
      keyStore.address,
      null,
    );
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

  it("increments nonce", async () => {
    const accountId = encryption.randomBytes(32);
    const keyPair = encryption.makeKeyPair();
    const message = "Sign this message with {nonce}";
    const keyStore = createInMemoryEvmKeyStore(keyPair);
    const ad = createSingleSigAuthDescriptorRegistration(
      [FlagsType.Transfer],
      keyStore.address,
      null,
    );
    const authService = createFakeAuthDataService({
      foo: { flags: ["T"], message },
    });
    const authenticator = createAuthenticator(
      accountId,
      [keyStore.createKeyHandler(testAdFromRegistration(ad))],
      authService,
    );

    const signature1 = await keyStore.signMessage(
      message.replace("{nonce}", "0"),
    );
    const signature2 = await keyStore.signMessage(
      message.replace("{nonce}", "1"),
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

  it("resets nonce between transactions if transaction is not submitted", async () => {
    const accountId = encryption.randomBytes(32);
    const keyPair = encryption.makeKeyPair();
    const message = "Sign this message with {nonce}";
    const keyStore = createInMemoryEvmKeyStore(keyPair);
    const ad = createSingleSigAuthDescriptorRegistration(
      [FlagsType.Transfer],
      keyStore.address,
      null,
    );
    const authService = createFakeAuthDataService({
      foo: { flags: ["T"], message },
    });
    authService.getNonce = () => Promise.resolve(0);
    const authenticator = createAuthenticator(
      accountId,
      [keyStore.createKeyHandler(testAdFromRegistration(ad))],
      authService,
    );

    const signature1 = await keyStore.signMessage(
      message.replace("{nonce}", "0"),
    );
    const signature2 = await keyStore.signMessage(
      message.replace("{nonce}", "1"),
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

  it("resets nonce if user rejects metamask signature", async () => {
    const accountId = encryption.randomBytes(32);
    const keyPair = encryption.makeKeyPair();
    const message = "Sign this message with {nonce}";
    let keyStore = createInMemoryEvmKeyStore(keyPair);
    const ad = createSingleSigAuthDescriptorRegistration(
      [FlagsType.Transfer],
      keyStore.address,
      null,
    );

    // Rewire the keystore to let us fake an user rejection on first call
    const oldSignFunc = keyStore.signMessage;
    const signMessage = jest
      .fn()
      .mockImplementationOnce(() => {
        const err = new Error() as EthersError;
        err.code = "ACTION_REJECTED";
        throw err;
      })
      .mockImplementation((msg: string) => oldSignFunc(msg));
    keyStore = { ...keyStore, signMessage };

    const authService = createFakeAuthDataService({
      foo: { flags: ["T"], message },
    });
    authService.getNonce = () => Promise.resolve(0);
    const authenticator = createAuthenticator(
      accountId,
      [createEvmKeyHandler(testAdFromRegistration(ad), keyStore)],
      authService,
    );

    await expect(
      transactionBuilder(authenticator, client)
        .add(op("foo"))
        .add(op("foo"))
        .build(),
    ).rejects.toThrow(Error);

    const signature1 = await keyStore.signMessage(
      message.replace("{nonce}", "0"),
    );
    const signature2 = await keyStore.signMessage(
      message.replace("{nonce}", "1"),
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
});
