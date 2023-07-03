import { SignatureProvider, Operation } from "postchain-client";
import { FlagsType } from "../auth-descriptor";

export type AuthData = {
  flags: Set<FlagsType>;
  message: string;
};

export interface KeyManager extends SignatureProvider {
  authorize(operation: Operation, auth_data: AuthData): Promise<Operation[]>;
  get flags(): Set<FlagsType>;
}
