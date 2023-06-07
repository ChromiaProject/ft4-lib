import { BufferId } from "/cryptoUtils";
import { Session } from "/ft3/types";

export type LoginOptions = {
  accountId: BufferId;
} & (
  | {
      configName: string;
      flags?: never;
    }
  | {
      configName?: never;
      flags: string[];
    }
  | {
      configName?: never;
      flags?: never;
    }
);

export type LoginManger = {
  login: (options: LoginOptions) => Promise<Session>;
  logout: () => void;
};
