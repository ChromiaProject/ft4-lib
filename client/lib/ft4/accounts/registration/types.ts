import { Operation } from "postchain-client";
import { Connection, FtKeyStore } from "@ft4/index";

export interface Strategy {
  getRegistrationDetails(connection: Connection): Promise<RegistrationDetails>;
}

export type RegistrationDetails = {
  strategyOperation: Operation;
  loginKeyStore: FtKeyStore | null;
};
