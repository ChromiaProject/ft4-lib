import { Buffer } from "buffer";
import { GTX, gtx } from "postchain-client";

export {
  AuthorizationError,
  AnchoringTimeoutError,
  TransactionBuilderConfig,
  OnAnchoredHandler,
  OnAnchoredHandlerData,
  TransactionBuilder,
} from "./types";

export { transactionBuilder } from "./transaction-builder";

export { signTransaction } from "./transaction-signer";

export function txDigest(tx: GTX): Buffer {
  return gtx.getDigestToSign({
    blockchainRid: tx.blockchainRid,
    signers: tx.signers,
    operations: tx.operations,
  });
}
