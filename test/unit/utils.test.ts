import { loadOperationFromTransaction } from "@ft4/utils";
import { RawGtx, gtv } from "postchain-client";

describe("Utils", () => {
  it("loads operation from raw transaction", async () => {
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

  it("loads operation from encoded transaction", async () => {
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
});
