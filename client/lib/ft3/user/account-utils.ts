import AssetBalance from "./asset-balance";
import PaymentHistoryIterator from "./payment-history/payment-history-iterator";
import PaymentHistorySyncManager from "./payment-history/payment-history-sync-manager";
import Blockchain from "../core/blockchain/blockchain";
import RateLimit from "./rate-limit";
import AuthDescriptorRule from "./auth-descriptor/auth-descriptor-rule";

enum AuthType {
  single_sig = "S",
  multi_sig = "M",
}

type PubKey = Buffer;

enum FlagsType {
  Account = "A", // Change Account settings
  Transfer = "T", // Transfer balance
}

interface GtvSerializable {
  toGTV(): any[];
}

class Flags {
  private flagsOrder = [FlagsType.Account, FlagsType.Transfer];

  flags: Set<FlagsType>;

  constructor(flags: Set<FlagsType>) {
    this.flags = flags;
  }

  hasFlag(flag: FlagsType) {
    return this.flags.has(flag);
  }

  toGTV() {
    return this.flagsOrder
      .map((flag) => (this.flags.has(flag) ? flag : null))
      .filter((flag) => flag);
  }
}

interface AuthDescriptor extends GtvSerializable {
  id: Buffer;
  signers: PubKey[];
  rule: AuthDescriptorRule | null;
  hash(): Buffer;
}

interface Account {
  readonly paymentHistorySyncManager: PaymentHistorySyncManager;
  readonly id: Buffer;
  readonly assets: AssetBalance[];
  readonly authDescriptor: AuthDescriptor[];
  readonly rateLimit: RateLimit;
  readonly blockchain: Blockchain;

  isAuthDescriptorValid(id: Buffer): Promise<boolean>;
  sync(): Promise<void>;
  getAssetById(id: Buffer): AssetBalance;
  getPaymentHistory(): Promise<any[]>;
  getPaymentHistoryIterator(pageSize: number): Promise<PaymentHistoryIterator>;
}

export {
  PubKey,
  Account,
  AuthDescriptor,
  AuthType,
  Flags,
  FlagsType,
  GtvSerializable,
};
