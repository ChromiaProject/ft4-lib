import { AuthDescriptorRegistration, SingleSig } from "@ft4/accounts";
import { FtKeyStore, LoginKeyStore } from "@ft4/authentication";

export type LoginDetails = {
  authDescriptor: AuthDescriptorRegistration<SingleSig>;
  loginKeyStore: LoginKeyStore;
  disposableKeyStore: FtKeyStore;
};
