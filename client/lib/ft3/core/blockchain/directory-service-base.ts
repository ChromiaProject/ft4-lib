import DirectoryService from "./directory-service";
import ChainConnectionInfo from "../chain-connection-info";
import { BufferId } from "../../../cryptoUtils";
import { formatter } from "postchain-client";

export default class DirectoryServiceBase implements DirectoryService {
  private chainInfos: ChainConnectionInfo[];

  constructor(chainInfos: ChainConnectionInfo[]) {
    this.chainInfos = chainInfos;
  }

  async getChainConnectionInfo(
    id: BufferId
  ): Promise<ChainConnectionInfo | undefined> {
    return this.chainInfos.find(
      (info) => info.brid.compare(formatter.ensureBuffer(id)) === 0
    );
  }
}
