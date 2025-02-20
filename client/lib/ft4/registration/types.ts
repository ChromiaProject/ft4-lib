import { Operation } from "postchain-client";
import { Connection } from "@ft4/ft-session";
import { FtKeyStore, KeyStore, LoginKeyStore } from "@ft4/authentication";
import {
  REGISTRATION_STRATEGY_ALL,
  REGISTRATION_STRATEGY_CURRENT,
} from "./constants";

/**
 * Represents information about what strategy was used to create an account
 */
export interface Strategy {
  /**
   * Fetches the details with which a certain account was registered
   * @param connection - connection to the blockchain on which the account is registered
   * @param keyStore - keystore which holds the main key of the account
   */
  getRegistrationDetails(
    connection: Connection,
    keyStore: KeyStore,
  ): Promise<RegistrationDetails>;
}

export type RegistrationDetails = {
  strategyOperation: Operation;
  loginKeyStore: LoginKeyStore | null;
  disposableKeyStore: FtKeyStore | null;
};

/**
 * Thrown to indicate that there was an error when trying to
 * register an account using a specific strategy.
 */
export class StrategyError extends Error {
  constructor(msg?: string) {
    super(msg);
    this.name = "StrategyError";
  }
}

export type TransferStrategyRuleAmount = TransferStrategyRulePartial & {
  minAmount: bigint;
};

export type TransferSenderBlockchains =
  | typeof REGISTRATION_STRATEGY_ALL
  | Buffer
  | Buffer[];

export type TransferParticipants =
  | typeof REGISTRATION_STRATEGY_ALL
  | TransferParticipantSingle
  | TransferParticipantSingle[];

export type TransferAssets =
  | typeof REGISTRATION_STRATEGY_ALL
  | AssetLimit
  | AssetLimit[];

export type TransferStrategyRulePartial = {
  senderBlockchains: TransferSenderBlockchains;
  senders: TransferParticipants;
  recipients: TransferParticipants;
  assets: TransferAssets;
  timeoutDays: number;
};

export type TransferParticipantSingle =
  | typeof REGISTRATION_STRATEGY_CURRENT
  | Buffer;

export type TransferStrategyRule = TransferStrategyRulePartial & {
  strategies: string[];
};

export type AssetLimit = {
  id?: Buffer;
  name?: string;
  issuingBlockchainRid?: Buffer;
  minAmount: bigint;
};
