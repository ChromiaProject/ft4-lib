import {
  AuthDescriptor,
  AuthType,
  SingleSig,
} from "@ft4/accounts/auth-descriptor";

export const nullAuthDescriptor: AuthDescriptor<SingleSig> = Object.freeze({
  id: Buffer.alloc(32, 0),
  accountId: Buffer.alloc(32, 0),
  authType: AuthType.SingleSig,
  args: {
    flags: [] as string[],
    signer: Buffer.alloc(32, 0),
  },
  rules: null,
  created: new Date(0),
});
