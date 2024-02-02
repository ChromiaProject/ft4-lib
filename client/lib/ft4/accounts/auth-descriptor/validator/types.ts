import { AnyAuthDescriptor } from "../types";
import { BufferId } from "@ft4/utils/types";

export type AuthDescriptorValidator = {
  isActive: (authDescriptor: AnyAuthDescriptor) => Promise<boolean>;
  hasExpired: (
    authDescriptor: AnyAuthDescriptor,
    accountId: BufferId,
  ) => Promise<boolean>;
};
