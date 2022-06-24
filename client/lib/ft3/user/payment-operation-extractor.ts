import { gtx } from "postchain-client";
import TransferOperation from "./payment-history/payment-operation/transfer-operation";
import XTransferOperation from "./payment-history/payment-operation/xtransfer-operation";
import PaymentOperation from "./payment-history/payment-operation/payment-operation";

function isCustomPaymentOperation(operation) {
  const { args } = operation;
  if (args.length === 0) {
    return false;
  }

  const lastArgument = args[args.length - 1];
  if (!Array.isArray(lastArgument) || lastArgument.length === 0) {
    return false;
  }

  return (
    lastArgument[0] === "simple_transfer" || lastArgument[0] === "transfer"
  );
}

function extractPaymentDetails(operation) {
  const { opName, args } = operation;
  const lastArgument = args[args.length - 1];

  if (lastArgument[0] === "simple_transfer") {
    return { opName, args: [[lastArgument[1]], [lastArgument[2]]] };
  } else if (lastArgument[0] === "transfer") {
    return { opName, args: [lastArgument[1], lastArgument[2]] };
  } else {
    throw new Error("Cannot read transfer details");
  }
}

export default class PaymentOperationExtractor {
  private readonly transaction: Buffer;
  private readonly chainId: string;

  constructor(rawTransaction: Buffer, chainId: string) {
    this.transaction = rawTransaction;
    this.chainId = chainId;
  }

  extract(): PaymentOperation[] {
    const transaction = gtx.deserialize(this.transaction);

    return transaction.operations
      .map((operation) => {
        switch (operation.opName) {
          case "ft3.transfer":
            return PaymentOperation.fromTransfer(
              TransferOperation.from(operation),
              this.chainId
            );
          case "ft3.xc.init_xfer":
            return PaymentOperation.fromXTransfer(
              XTransferOperation.from(operation),
              this.chainId
            );
          default:
            if (isCustomPaymentOperation(operation)) {
              return PaymentOperation.fromTransfer(
                TransferOperation.from(extractPaymentDetails(operation)),
                this.chainId
              );
            } else {
              return null;
            }
        }
      })
      .filter((transfer) => transfer);
  }
}
