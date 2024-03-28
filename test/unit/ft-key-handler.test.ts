import { createFakeAuthDataService, createTestAuthDescriptor } from "@ft4-test/util";
import { aggregateSigners } from "@ft4/accounts";
import { createInMemoryFtKeyStore, ftAuth } from "@ft4/authentication";
import { op } from "@ft4/utils";
import { Buffer } from "buffer";
import { RellOperation, encryption, gtx } from "postchain-client";

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

    const transaction = {
      blockchainRid: Buffer.from(
        "0000000000000000000000000000000000000000000000000000000000000000",
        "hex",
      ),
      operations: [] as RellOperation[],
      signers: aggregateSigners(authDescriptor),
      signatures: [] as Buffer[],
    };
    transaction.operations.push({ opName: "foo", args: [] });

    const keyHandler =
      createInMemoryFtKeyStore(keyPair).createKeyHandler(authDescriptor);
    transaction.signatures = [await keyHandler.sign(transaction)];

    const digestToSign = gtx.getDigestToSign(transaction);
    const signature2 = encryption.signDigest(digestToSign, keyPair.privKey);

    expect(transaction.signatures).toEqual([signature2]);
  });
});
