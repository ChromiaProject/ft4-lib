import { RawGtv } from "postchain-client";

type GtxOperation = {
    name: string;
    args: RawGtv[];
};

type GtxTransactionBody = {
    blockchain_rid: Buffer;
    operations: GtxOperation[];
    signers: Buffer[];
};

export type GtxTransaction = {
    body: GtxTransactionBody;
    signatures: Buffer[];
};
