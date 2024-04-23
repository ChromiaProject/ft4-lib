import { Account } from "@ft4/accounts";
import { Amount, Asset, AssetResponse } from "@ft4/asset";

export type LockAccountResponse = {
  type: string;
  id: Buffer;
};

export type LockAccount = {
  type: string;
  account: Account;
};

export type LockedAmountResponse = {
  type: string;
  amount: bigint;
};

export type LockedAmount = {
  type: string;
  amount: Amount;
};

export type LockedBalanceResponse = {
  type: string;
  asset: AssetResponse;
  amount: bigint;
};

export type LockedBalance = {
  type: string;
  asset: Asset;
  amount: Amount;
};

export type LockedAggregatedBalanceResponse = {
  asset: AssetResponse;
  amount: bigint;
};

export type LockedAggregatedBalance = {
  asset: Asset;
  amount: Amount;
};
