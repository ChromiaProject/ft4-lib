import { RellOperation, encryption, gtx } from "postchain-client";
import { ftAuth } from "../client/lib/ft4/authentication/ft";
import { createInMemoryFtKeyStore } from "../client/lib/ft4/authentication/ft/key-stores/in-memory";
import { op } from "../client/lib/ft4/utils";
import { createChromiaClient } from "./util/blockchain-util";
import { createFakeAuthDataService } from "./util/fake-auth-data-service";
import { createTestAuthDescriptor } from "./util/util";
import { aggregateSigners, deriveAuthDescriptorId } from "/ft4/accounts";

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

    const client = await createChromiaClient();
    const transaction = {
      blockchainRid: Buffer.from(client.config.blockchainRid, "hex"),
      operations: [] as RellOperation[],
      signers: aggregateSigners(authDescriptor),
      signatures: [],
    };
    transaction.operations.push({ opName: "foo", args: [] });

    const keyHandler =
      createInMemoryFtKeyStore(keyPair).createKeyHandler(authDescriptor);
    await keyHandler.sign(transaction);

    const digestToSign = gtx.getDigestToSign(transaction);
    const signature = encryption.signDigest(digestToSign, keyPair.privKey);

    expect(transaction.signatures).toEqual([signature]);
  });
});
