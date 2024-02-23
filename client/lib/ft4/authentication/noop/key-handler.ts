import { Buffer } from "buffer";
import { BufferId, TxContext } from "@ft4/utils";
import { AuthDataService, KeyHandler } from "../types";
import { nullKeyStore } from "./key-store";
import { GTX, Operation } from "postchain-client";
import { nullAuthDescriptor } from "./auth-descriptor";

export const noopKeyHandler: KeyHandler = Object.freeze({
  authDescriptor: nullAuthDescriptor,
  keyStore: nullKeyStore,
  satisfiesAuthRequirements: (_flags: string[]) => true,
  authorize: (
    _accountId: BufferId,
    operation: Operation,
    _context: TxContext,
    _authDataService: AuthDataService,
  ) => Promise.resolve([operation]),
  sign: (_transaction: GTX) => Promise.resolve(Buffer.alloc(64, 0)),
  getSigners: (): Buffer[] => [],
});
