import { RellOperation, encryption, gtx } from "postchain-client";
import { ftAuth } from "../client/lib/ft4/authentication/ft";
import { createInMemoryFtKeyStore } from "../client/lib/ft4/authentication/ft/key-stores/in-memory";
import { op } from "../client/lib/ft4/utils";
import { createChromiaClient } from "./util/blockchain-util";
import { createFakeAuthDataService } from "./util/fake-auth-data-service";
import { createTestAuthDescriptorRegistration } from "./util/util";
import { aggregateSigners, deriveAccountId } from "/ft4/accounts";

describe("FT key handler", () => {
  it("should insert FT auth operation", async () => {
    const accountId = encryption.randomBytes(32);
    const { keyPair, authDescriptorRegistration } =
      createTestAuthDescriptorRegistration();

    const keyHandler = createInMemoryFtKeyStore(keyPair).createKeyHandler(
      authDescriptorRegistration,
    );
    const operations = await keyHandler.authorize(
      accountId,
      op("foo"),
      0,
      createFakeAuthDataService({}),
    );

    expect(operations).toEqual([
      ftAuth(accountId, deriveAccountId(authDescriptorRegistration)),
      op("foo"),
    ]);
  });

  it("should sign transaction", async () => {
    const { keyPair, authDescriptorRegistration } =
      createTestAuthDescriptorRegistration();

    const client = await createChromiaClient();
    const transaction = {
      blockchainRid: Buffer.from(client.config.blockchainRid, "hex"),
      operations: [] as RellOperation[],
      signers: aggregateSigners(authDescriptorRegistration),
      signatures: [],
    };
    transaction.operations.push({ opName: "foo", args: [] });

    const keyHandler = createInMemoryFtKeyStore(keyPair).createKeyHandler(
      authDescriptorRegistration,
    );
    await keyHandler.sign(transaction);

    const digestToSign = gtx.getDigestToSign(transaction);
    const signature = encryption.signDigest(digestToSign, keyPair.privKey);

    expect(transaction.signatures).toEqual([signature]);
  });
});
