import { AnyAuthDescriptor } from "../types";

export type AuthDescriptorValidator = {
  isActive: (authDescriptor: AnyAuthDescriptor) => Promise<boolean>;
  hasExpired: (authDescriptor: AnyAuthDescriptor) => Promise<boolean>;
};
