import { LoginKeyStore } from "./stores/types";
import { BufferId } from "/cryptoUtils";
import { Session } from "/ft3/types";

export type LoginConfig = {
  flags: string[];
};

export type LoginOptions = {
  accountId: BufferId;
  loginKeyStore?: LoginKeyStore;
} & (
  | {
      configName: string;
      config?: never;
    }
  | {
      configName?: never;
      config: LoginConfig;
    }
  | {
      configName?: never;
      config?: never;
    }
);

export type LoginManger = {
  login: (options: LoginOptions) => Promise<Session>;
  logout: (accountId: Buffer) => void;
};
