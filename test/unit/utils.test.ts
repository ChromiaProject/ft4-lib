import { deriveNonce, loadOperationFromTransaction, op } from "@ft4/utils";
import { MERKLE_HASH_VERSIONS } from "@ft4/utils/main";
import { RawGtx, encryption, formatter, gtv } from "postchain-client";

describe("Utils", () => {
  it("loads operation from raw transaction", () => {
    const tx: RawGtx = [
      [
        Buffer.alloc(64),
        [
          ["foo", [1, "two"]],
          ["bar", ["aa", "bb"]],
        ],
        [],
      ],
      [],
    ];

    expect(loadOperationFromTransaction(tx, 0)).toEqual({
      name: "foo",
      args: [1, "two"],
    });
    expect(loadOperationFromTransaction(tx, 1)).toEqual({
      name: "bar",
      args: ["aa", "bb"],
    });
  });

  it("loads operation from encoded transaction", () => {
    const tx: RawGtx = [
      [
        Buffer.alloc(64),
        [
          [
            "do_something",
            [Buffer.from("aa", "hex"), Buffer.from("bb", "hex")],
          ],
          ["do_something_else", [11, 22]],
        ],
        [],
      ],
      [],
    ];

    expect(loadOperationFromTransaction(gtv.encode(tx), 0)).toEqual({
      name: "do_something",
      args: [Buffer.from("aa", "hex"), Buffer.from("bb", "hex")],
    });
    expect(loadOperationFromTransaction(gtv.encode(tx), 1)).toEqual({
      name: "do_something_else",
      args: [11, 22],
    });
  });

  it("correctly derives nonce", () => {
    const blockchainRid = encryption.randomBytes(32);
    const operation = op("foo");
    const authDescriptorCounter = 0;
    expect(
      deriveNonce(blockchainRid, operation, authDescriptorCounter),
    ).toEqual(
      formatter.toString(
        gtv.gtvHash(
          [
            blockchainRid,
            operation.name,
            operation.args,
            authDescriptorCounter,
          ],
          MERKLE_HASH_VERSIONS.ONE,
        ),
      ),
    );
  });

  // In order to reproduce different hashes the args must be contain Array e.g. args: [ [1] ]
  it("derives nonce for merkleHashVersion 1 and 2 and ensures they differ", () => {
    const blockchainRid = encryption.randomBytes(32);
    const operation = op("foo", [[1]]);
    const authDescriptorCounter = 0;

    const deriveNonceVersionOne = deriveNonce(
      blockchainRid,
      operation,
      authDescriptorCounter,
      MERKLE_HASH_VERSIONS.ONE,
    );

    const deriveNonceVersionTwo = deriveNonce(
      blockchainRid,
      operation,
      authDescriptorCounter,
      MERKLE_HASH_VERSIONS.TWO,
    );

    expect(deriveNonceVersionOne).not.toEqual(deriveNonceVersionTwo);
  });
});
