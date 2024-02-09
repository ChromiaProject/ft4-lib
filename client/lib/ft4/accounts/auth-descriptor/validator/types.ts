import { AnyAuthDescriptor } from "@ft4/accounts";
import { BufferId } from "@ft4/utils";

export type AuthDescriptorValidator = {
  isActive: (authDescriptor: AnyAuthDescriptor) => Promise<boolean>;
  hasExpired: (
    authDescriptor: AnyAuthDescriptor,
    accountId: BufferId,
  ) => Promise<boolean>;
};
