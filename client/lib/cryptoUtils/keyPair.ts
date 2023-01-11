import * as pcl from "postchain-client";
import { BufferId } from "./index";

class KeyPair {
  readonly pubKey: Buffer;
  readonly privKey: Buffer;

  constructor(privateKey?: BufferId) {
    if (privateKey) {
      this.privKey = pcl.formatter.ensureBuffer(privateKey);
      this.pubKey = pcl.encryption.createPublicKey(this.privKey);
    } else {
      const { pubKey, privKey } = this.makeKeyPair();
      this.pubKey = pubKey;
      this.privKey = privKey;
    }
  }

  makeKeyPair = () => {
    return pcl.encryption.makeKeyPair();
  };
}

export default KeyPair;
