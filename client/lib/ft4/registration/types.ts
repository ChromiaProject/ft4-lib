import { Operation } from "postchain-client";
import { Connection } from "@ft4/ft-session";
import { FtKeyStore, KeyStore, LoginKeyStore } from "@ft4/authentication";

export interface Strategy {
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

export class StrategyError extends Error {
  constructor(msg?: string) {
    super(msg);
    this.name = "StrategyError";
  }
}
