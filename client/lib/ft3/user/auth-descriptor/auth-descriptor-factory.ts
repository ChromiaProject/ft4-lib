import { gtv } from "postchain-client";
import { AuthDescriptor } from "../account-utils";
import SingleSignatureAuthDescriptor from "./single-signature-auth-descriptor";

export default class AuthDescriptorFactory {
  create(type: string, args: Buffer): AuthDescriptor {
    switch (type) {
      case "S":
        return this.createSingleSig(args);
    }
  }

  private createSingleSig(args: Buffer): SingleSignatureAuthDescriptor {
    const decodedDescriptor = gtv.decode(args);
    return new SingleSignatureAuthDescriptor(
      Buffer.from(decodedDescriptor[1], "hex"),
      decodedDescriptor[0]
    );
  }
}
