import {
  AuthDescriptorRegistration,
  SingleSig,
} from "@ft4/accounts/auth-descriptor";
import { FtKeyStore } from "@ft4/authentication";
import { LoginKeyStore } from "@ft4/authentication/login";

export type LoginDetails = {
  authDescriptor: AuthDescriptorRegistration<SingleSig>;
  loginKeyStore: LoginKeyStore;
  disposableKeyStore: FtKeyStore;
};
