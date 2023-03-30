import { encryption } from "postchain-client";
import { makeKeyPair } from "postchain-client/built/src/encryption/encryption";
import { gtvHash } from "postchain-client/built/src/gtv";
import { SignatureProvider } from "postchain-client/built/src/gtx/interfaces";
import { BufferId } from "../../client/lib/cryptoUtils";

export default function maliciousSignatureProvider(
  priv: BufferId
): SignatureProvider {
  return Object.freeze({
    pubKey: makeKeyPair(priv).pubKey,
    sign: async () => {
      const hash = gtvHash({ opName: "malicious", args: ["code"] });
      return encryption.signDigest(hash, this.keyPair.privKey);
    },
  });
}
