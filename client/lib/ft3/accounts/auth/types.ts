import { SignatureProvider } from "postchain-client/built/src/gtx/interfaces";
import { Operation } from "../../utils/types";
import { FlagsType } from "../auth-descriptor";

export type AuthData = {
  flags: Set<FlagsType>;
  message: string;
};

export interface KeyManager extends SignatureProvider {
  authorize(operation: Operation, auth_data: AuthData): Promise<Operation[]>;
  get flags(): Set<FlagsType>;
}
