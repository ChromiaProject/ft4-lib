import { SignatureProvider, Operation } from "postchain-client";
import { FlagsType } from "@ft4/accounts/auth-descriptor";

export interface KeyManager extends SignatureProvider {
  authorize(operation: Operation): Promise<Operation[]>;
  get flags(): Set<FlagsType>;
}
