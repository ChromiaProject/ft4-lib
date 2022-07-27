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
  private readonly brid: string;

  constructor(rawTransaction: Buffer, brid: string) {
    this.transaction = rawTransaction;
    this.brid = brid;
  }

  extract(): PaymentOperation[] {
    const transaction = gtx.deserialize(this.transaction);

    return transaction.operations
      .map((operation) => {
        switch (operation.opName) {
          case "ft3.transfer":
            return PaymentOperation.fromTransfer(
              TransferOperation.from(operation),
              this.brid
            );
          case "ft3.xc.init_xfer":
            return PaymentOperation.fromXTransfer(
              XTransferOperation.from(operation),
              this.brid
            );
          default:
            if (isCustomPaymentOperation(operation)) {
              return PaymentOperation.fromTransfer(
                TransferOperation.from(extractPaymentDetails(operation)),
                this.brid
              );
            } else {
              return null;
            }
        }
      })
      .filter((transfer) => transfer);
  }
}
