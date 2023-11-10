import { BufferId } from "../../cryptoUtils";
import { Session } from "../../types";

export type LoginConfig = {
  flags: string[];
};

export type LoginOptions = {
  accountId: BufferId;
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
  login: (loginOptions: LoginOptions) => Promise<Session>;
  logout: (accountId: Buffer) => void;
};
