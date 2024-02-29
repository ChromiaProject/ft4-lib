import { TransactionReceipt } from "postchain-client";
import { OptionalPageCursor, Session } from "@ft4/types";
import { Buffer } from "buffer";

export type BufferId = string | Buffer;

export type Config = {
  rateLimit: {
    active: 0 | 1;
    maxPoints: number;
    recoveryTime: number;
    pointsAtAccountCreation: number;
  };
};

export type ConnectionCallbackParams = {
  accounts: string[];
  chainId: number;
};

export type ExternalWalletConnection = {
  connectionUri: string;
  getAccounts: () => string[];
  signMessage: ({
    message,
    account,
  }: {
    message: string;
    account: string;
  }) => Promise<string>;
};

export type EntityRetriever<T> = {
  retrieve: (
    limit?: number,
    cursor?: OptionalPageCursor,
  ) => Promise<PaginatedEntity<T>>;
};

export type PaginatedEntity<T> = {
  data: T[];
  nextCursor: OptionalPageCursor;
};

export type TxContext = { [nonceId: string]: number | null };

export interface RellAppStructure {
  [modules: string]: Record<string, RellModuleStructure>;
}

export interface RellModuleStructure {
  operations?: { [key: string]: RellOperationStructure };
}

export interface RellOperationStructure {
  mount: string;
  parameters: any[];
}

export type RequireTogether<T, Keys extends keyof T> = T & {
  [K in Keys]-?: T[K];
};

export type TransactionCompletion<T = undefined> = T extends undefined
  ? { receipt: TransactionReceipt }
  : { receipt: TransactionReceipt; data: T };

export type TransactionSessionCompletion<T = undefined> = T extends undefined
  ? { receipt: TransactionReceipt; session: Session }
  : { receipt: TransactionReceipt; session: Session; data: T };
