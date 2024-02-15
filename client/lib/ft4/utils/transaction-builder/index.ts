import { Buffer } from "buffer";
import { gtx } from "postchain-client";
import { TxBuilderTransaction } from "../types";

export {
  AuthorizationError,
  AnchoringTimeoutError,
  TransactionBuilderConfig,
  OnAnchoredHandler,
  OnAnchoredHandlerData,
  TransactionBuilder,
} from "./types";

export { transactionBuilder } from "./transaction-builder";

export function txDigest(tx: TxBuilderTransaction): Buffer {
  return gtx.getDigestToSign({
    blockchainRid: tx.blockchainRid,
    signers: tx.signers,
    operations: tx.operations,
  });
}
