import { encryption } from "postchain-client";
import { createTestAuthDescriptor, toNewTx } from "./util/util";
import { createInMemoryFTKeyStore } from "../client/lib/ft3/authentication/ft/key-stores/in-memory";
import { _op } from "../client/lib/ft3/utils";
import { ftAuth } from "../client/lib/ft3/authentication/ft";
import { createClient } from "./util/blockchain-util";

describe("FT key handler", () => {
  it("should insert FT auth operation", async () => {
    const accountId = encryption.randomBytes(32);
    const { keyPair, authDescriptor } = createTestAuthDescriptor();

    const keyHandler =
      createInMemoryFTKeyStore(keyPair).createKeyHandler(authDescriptor);
    const operations = await keyHandler.authenticate(accountId, _op("foo"), {
      flags: [],
      message: "",
    });

    expect(operations).toEqual([
      ftAuth(accountId, authDescriptor.id),
      _op("foo"),
    ]);
  });

  it("should sign transaction", async () => {
    const { keyPair, authDescriptor } = createTestAuthDescriptor();

    const client = await createClient();
    const transaction = client.newTransaction(authDescriptor.signers);
    transaction.addOperation("foo");

    const keyHandler =
      createInMemoryFTKeyStore(keyPair).createKeyHandler(authDescriptor);
    const newTx = toNewTx(transaction);
    await keyHandler.sign(newTx);

    const digestToSign = transaction.getDigestToSign();
    const signature = encryption.signDigest(digestToSign, keyPair.privKey);

    expect(newTx.signatures).toEqual([signature]);
  });
});
