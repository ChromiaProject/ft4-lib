import DirectoryServiceBase from "./blockchain/directory-service-base";
import ChainConnectionInfo from "./chain-connection-info";
import Blockchain from "./blockchain/blockchain";
import { getBRID } from "./lib/utils";
import { ensureBuffer, Id } from "../../cyptoUtils";

export default class Postchain {
  constructor(readonly url: string) {}

  async blockchain(id: Id | number): Promise<Blockchain> {
    let _id;
    if (typeof id === "number") {
      _id = await getBRID(this.url, id);
    } else {
      _id = ensureBuffer(id);
    }

    const directoryService = new DirectoryServiceBase([
      new ChainConnectionInfo(_id, this.url),
    ]);

    return await Blockchain.initialize(_id, directoryService);
  }
}
