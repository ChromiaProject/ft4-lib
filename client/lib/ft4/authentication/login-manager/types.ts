import { Session } from "@ft4/index";
import { Buffer } from "buffer";
import { BufferId } from "@ft4/utils";

export type LoginConfig = {
  flags: string[];
};

export type LoginOptions = {
  accountId: BufferId;
} & LoginConfigOptions;

export type LoginConfigOptions =
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
    };

export type LoginManger = {
  login: (loginOptions: LoginOptions) => Promise<Session>;
  logout: (accountId: Buffer) => void;
};
