import DirectoryServiceBase from "./blockchain/directory-service-base";
import ChainConnectionInfo from "./chain-connection-info";
import Blockchain from "./blockchain/blockchain";
import { BufferId } from "../../cryptoUtils";
import { formatter, restClientutil } from "postchain-client";

export default class Postchain {
  constructor(readonly urls: string[]) {}

  async blockchain(id: BufferId | number): Promise<Blockchain> {
    let _id: Buffer;
    if (typeof id === "number") {
      _id = Buffer.from(await restClientutil.getBrid(this.urls[0], id), "hex");
    } else {
      _id = formatter.ensureBuffer(id);
    }

    const directoryService = new DirectoryServiceBase([
      new ChainConnectionInfo(_id, this.urls),
    ]);

    return await Blockchain.initialize(_id, directoryService);
  }
}
