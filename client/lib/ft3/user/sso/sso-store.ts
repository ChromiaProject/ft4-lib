import KeyPair from "../../../cyptoUtils/keyPair";

export default interface SSOStore {
  readonly tmpKeyPair: KeyPair;
  readonly keyPair: KeyPair;
  tmpPrivKey: Buffer;
  privKey: Buffer;
  accountId: Buffer;
  clearTmp();
  clear();
}
