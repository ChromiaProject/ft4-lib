import { gtv } from "postchain-client";
import { encodeGtv, GtvEncoded } from "../../core/gtv";
import {
  AuthDescriptor,
  AuthType,
  Flags,
  FlagsType,
  PubKey,
} from "../account-utils";
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

  encodeGtv(): GtvEncoded {
    return [
      AuthType.single_sig,
      [this.pubkey.toString("hex")],
      [this.flags.encodeGtv(), this.pubkey.toString("hex")],
      encodeGtv(this.rule),
    ];
  }

  hash(): Buffer {
    return gtv.gtvHash([
      AuthType.single_sig,
      [this.pubkey],
      [this.flags.encodeGtv(), this.pubkey.toString("hex")],
      encodeGtv(this.rule),
    ]);
  }
}
