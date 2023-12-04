import { encryption, gtx } from "postchain-client";
import { createTestAuthDescriptor } from "../util/util";
import { createInMemoryFtKeyStore } from "/ft4/authentication/ft/key-stores/in-memory";
import { op } from "/ft4/utils";
import { ftAuth } from "/ft4/authentication/ft";
import { createFakeAuthDataService } from "../util/fake-auth-data-service";
import { createStubClient } from "../util/blockchain-util";

describe("FT key handler", () => {
  it("should insert FT auth operation", async () => {
    const accountId = encryption.randomBytes(32);
    const { keyPair, authDescriptor } = createTestAuthDescriptor();

    const keyHandler =
      createInMemoryFtKeyStore(keyPair).createKeyHandler(authDescriptor);
    const operations = await keyHandler.authorize(
      accountId,
      op("foo"),
      {},
      createFakeAuthDataService({}),
    );

    expect(operations).toEqual([
      ftAuth(accountId, authDescriptor.id),
      op("foo"),
    ]);
  });

  it("should sign transaction", async () => {
    const { keyPair, authDescriptor } = createTestAuthDescriptor();

    const client = await createStubClient();
    const transaction = {
      blockchainRid: Buffer.from(client.config.blockchainRid, "hex"),
      operations: [],
      signers: authDescriptor.signers,
      signatures: [],
    };
    transaction.operations.push(op("foo"));

    const keyHandler =
      createInMemoryFtKeyStore(keyPair).createKeyHandler(authDescriptor);
    await keyHandler.sign(transaction);

    const digestToSign = gtx.getDigestToSign(transaction);
    const signature = encryption.signDigest(digestToSign, keyPair.privKey);

    expect(transaction.signatures).toEqual([signature]);
  });
});
