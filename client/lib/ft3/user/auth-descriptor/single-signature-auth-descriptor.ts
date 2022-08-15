import { gtv } from "postchain-client";
import { AuthDescriptor, AuthType, Flags, FlagsType, PubKey } from "../account";
import AuthDescriptorRule from "./auth-descriptor-rule";

export default class SingleSignatureAuthDescriptor implements AuthDescriptor {
  pubkey: PubKey;
  flags: Flags;

  constructor(
    pubkey: PubKey,
    flags: FlagsType[],
    readonly rule: AuthDescriptorRule | null = null
  ) {
    this.flags = new Flags(new Set(flags));
    this.pubkey = pubkey;
  }

  get signers(): PubKey[] {
    return [this.pubkey];
  }

  get id(): Buffer {
    return this.hash();
  }

  toGTV(): any[] {
    return [
      AuthType.single_sig,
      [this.pubkey.toString("hex")],
      [this.flags.toGTV(), this.pubkey.toString("hex")],
      this.rule && this.rule.toGTV(),
    ];
  }

  hash(): Buffer {
    return gtv.gtvHash([
      AuthType.single_sig,
      [this.pubkey],
      [this.flags.toGTV(), this.pubkey.toString("hex")],
      this.rule && this.rule.toGTV(),
    ]);
  }
}
