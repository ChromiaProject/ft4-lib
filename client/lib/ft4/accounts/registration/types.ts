import { Operation } from "postchain-client";
import { Connection, FtKeyStore } from "@ft4/index";
import { LoginKeyStore } from "@ft4/authentication/login-manager/index";

export interface Strategy {
  getRegistrationDetails(connection: Connection): Promise<RegistrationDetails>;
}

export type RegistrationDetails = {
  strategyOperation: Operation;
  loginKeyStore: LoginKeyStore | null;
  disposableKeyStore: FtKeyStore | null;
};
