import DirectoryService from "./directory-service";
import ChainConnectionInfo from "../chain-connection-info";
import { ensureBuffer, Id } from "../../../cryptoUtils";

export default class DirectoryServiceBase implements DirectoryService {
  private chainInfos: ChainConnectionInfo[];

  constructor(chainInfos: ChainConnectionInfo[]) {
    this.chainInfos = chainInfos;
  }

  async getChainConnectionInfo(
    id: Id
  ): Promise<ChainConnectionInfo | undefined> {
    return this.chainInfos.find(
      (info) => info.brid.compare(ensureBuffer(id)) === 0
    );
  }
}
