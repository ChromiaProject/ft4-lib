import { Operation } from "postchain-client";
import { Connection, FtKeyStore, KeyStore } from "@ft4/index";

export interface Strategy {
  getRegistrationDetails(
    connection: Connection,
    keyStore: KeyStore,
  ): Promise<RegistrationDetails>;
}

export type RegistrationDetails = {
  strategyOperation: Operation;
  loginKeyStore: FtKeyStore | null;
};

export class StrategyError extends Error {
  constructor(msg?: string) {
    super(msg);
    this.name = "StrategyError";
  }
}
