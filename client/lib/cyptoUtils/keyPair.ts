import * as pcl from "postchain-client";
import { ensureBuffer, Id } from "./index";

class KeyPair {
  readonly pubKey: Buffer;
  readonly privKey: Buffer;

  constructor(privateKey?: Id) {
    if (privateKey) {
      this.privKey = ensureBuffer(privateKey);
      this.pubKey = pcl.util.createPublicKey(this.privKey);
    } else {
      const { pubKey, privKey } = this.makeKeyPair();
      this.pubKey = pubKey;
      this.privKey = privKey;
    }
  }

  makeKeyPair = () => {
    return pcl.util.makeKeyPair();
  };
}

export default KeyPair;
