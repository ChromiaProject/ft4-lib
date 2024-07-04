import { GTX, RawGtx, RellOperation, gtv, gtx } from "postchain-client";
import {
  PendingTransfer,
  GtvInitTransferArgs,
  hasCrosschainTransferExpired,
} from "@ft4/crosschain";

function createDummyPendingTransfer(
  deadline: number,
  accountId: Buffer = Buffer.alloc(32),
  opIndex = 0,
): PendingTransfer {
  const dummyId = Buffer.alloc(32);

  const operations = Array<RellOperation>(opIndex).fill({
    opName: "ft4.ft_auth",
    args: [],
  });
  operations.push({
    opName: "ft4.init_transfer",
    args: <GtvInitTransferArgs>[dummyId, dummyId, 0n, [dummyId], deadline],
  });
  const tx: GTX = {
    blockchainRid: dummyId,
    operations,
    signers: [],
  };

  return {
    opIndex,
    tx: gtv.decode(gtx.serialize(tx)) as RawGtx,
    accountId,
  };
}

const now = Date.now();

describe("Crosschain", () => {
  it("hasCrosschainTransferExpired returns true for expired transfer", () => {
    const expired = createDummyPendingTransfer(now - 1);

    expect(hasCrosschainTransferExpired(expired)).toBe(true);
  });
  it("hasCrosschainTransferExpired returns false for valid transfer", () => {
    const expired = createDummyPendingTransfer(now * 2);

    expect(hasCrosschainTransferExpired(expired)).toBe(false);
  });
});
