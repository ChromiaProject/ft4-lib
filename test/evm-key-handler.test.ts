import { authDescriptor } from "../client/lib/ft4/accounts/auth-descriptor";
import { createInMemoryEvmKeyStore } from "../client/lib/ft4/authentication/evm/key-stores/in-memory";
import { op } from "../client/lib/ft4/utils";
import { evmAuth } from "../client/lib/ft4/authentication/evm";
import { createKeyStoreInteractor } from "../client/lib/ft4/ft-session";
import { transactionBuilder } from "../client/lib/ft4/utils/transaction-builder";
import { createAuthenticator } from "../client/lib/ft4/authentication";
import { createFakeAuthDataService } from "./util/fake-auth-data-service";
import { createAccount } from "./util/util";
import { ethers } from "ethers";
import { IClient, encryption, gtx } from "postchain-client";
import { createChromiaClient } from "./util/blockchain-util";
import { Buffer } from "buffer";

describe("EVM key handler", () => {
  let client: IClient;

  beforeAll(async () => {
    client = await createChromiaClient();
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
    const ad = authDescriptor.create.singleSig.withArgs(
      [],
      keyStore.address,
    ).andNoRules;
    const keyHandler = keyStore.createKeyHandler(ad);
    const authData = {
      flags: [],
      message: "Message to sign",
    };

    const operations = await keyHandler.authorize(
      accountId,
      op("foo"),
      createFakeAuthDataService({
        foo: authData,
      }),
    );

    const signature = await keyStore.signMessage(authData.message);
    expect(operations).toEqual([
      evmAuth(accountId, ad.id, [signature]),
      op("foo"),
    ]);
  });

  it("should increment nonce", async () => {
    const accountId = encryption.randomBytes(32);
    const keyPair = encryption.makeKeyPair();
    const message = "Sign this message with {nonce}";
    const keyStore = createInMemoryEvmKeyStore(keyPair);
    const ad = authDescriptor.create.singleSig.withArgs(
      ["T"],
      keyStore.address,
    ).andNoRules;
    const authService = createFakeAuthDataService({
      foo: { flags: ["T"], message },
    });
    const authenticator = createAuthenticator(
      accountId,
      [keyStore.createKeyHandler(ad)],
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
        args: [accountId, ad.id, [[signature1.r, signature1.s, signature1.v]]],
      },
      {
        opName: "foo",
        args: [],
      },
      {
        opName: "ft4.evm_auth",
        args: [accountId, ad.id, [[signature2.r, signature2.s, signature2.v]]],
      },
      {
        opName: "foo",
        args: [],
      },
    ]);
  });

  it("should add FT auth descriptor", async () => {
    const keyPair = encryption.makeKeyPair();
    const keyStore = createInMemoryEvmKeyStore(keyPair);
    const ad = authDescriptor.create.singleSig.withArgs(
      ["A"],
      keyStore.address,
    ).andNoRules;
    await createAccount(client, ad);

    const session = await createKeyStoreInteractor(client, keyStore).getSession(
      ad.id,
    );

    const keyPair2 = encryption.makeKeyPair();
    const ad2 = authDescriptor.create.singleSig.withArgs(
      ["T"],
      keyPair2.pubKey,
    ).andNoRules;
    await session.account.addAuthDescriptor(ad2, keyPair2);

    const authDescriptors = await session.account.getAuthDescriptors();
    expect(authDescriptors.data.length).toEqual(2);
  });
});
