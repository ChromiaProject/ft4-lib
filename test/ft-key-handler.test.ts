import { encryption } from "postchain-client";
import { createTestAuthDescriptor } from "./util/util";
import { createInMemoryFTKeyStore } from "../client/lib/ft3/authentication/ft/key-stores/in-memory";
import { op } from "../client/lib/ft3/utils";
import { ftAuth } from "../client/lib/ft3/authentication/ft";
import { createClient } from "./util/blockchain-util";
import { createFakeAuthDataService } from "./util/fake-auth-data-service";

describe("FT key handler", () => {
  it("should insert FT auth operation", async () => {
    const accountId = encryption.randomBytes(32);
    const { keyPair, authDescriptor } = createTestAuthDescriptor();

    const keyHandler =
      createInMemoryFTKeyStore(keyPair).createKeyHandler(authDescriptor);
    const operations = await keyHandler.authenticate(
      accountId,
      op("foo"),
      0,
      createFakeAuthDataService({})
    );

    expect(operations).toEqual([
      ftAuth(accountId, authDescriptor.id),
      op("foo"),
    ]);
  });

  it("should sign transaction", async () => {
    const { keyPair, authDescriptor } = createTestAuthDescriptor();

    const client = await createClient();
    const transaction = client.newTransaction(authDescriptor.signers);
    transaction.addOperation("foo");

    const keyHandler =
      createInMemoryFTKeyStore(keyPair).createKeyHandler(authDescriptor);
    await keyHandler.sign(transaction);

    const digestToSign = transaction.getDigestToSign();
    const signature = encryption.signDigest(digestToSign, keyPair.privKey);

    expect(transaction.gtx.signatures).toEqual([signature]);
  });
});
