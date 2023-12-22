import { RellOperation, encryption, gtx } from "postchain-client";
import { aggregateSigners, deriveAuthDescriptorId } from "@ft4/accounts";
import { ftAuth } from "@ft4/authentication/ft";
import { createInMemoryFtKeyStore } from "@ft4/authentication/ft/key-stores/in-memory";
import { op } from "@ft4/utils";
import { createFakeAuthDataService } from "../util/fake-auth-data-service";
import { createTestAuthDescriptor } from "../util/util";

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
      ftAuth(accountId, deriveAuthDescriptorId(authDescriptor)),
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
