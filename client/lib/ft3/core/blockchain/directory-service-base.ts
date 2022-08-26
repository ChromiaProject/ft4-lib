import DirectoryService from "./directory-service";
import ChainConnectionInfo from "../chain-connection-info";

export default class DirectoryServiceBase implements DirectoryService {
  private chainInfos: ChainConnectionInfo[];

  constructor(chainInfos: ChainConnectionInfo[]) {
    this.chainInfos = chainInfos;
  }

  async getChainConnectionInfo(
    id: Buffer
  ): Promise<ChainConnectionInfo | undefined> {
    return this.chainInfos.find(
      (info) => info.brid.toString("hex") === id.toString("hex")
    );
  }
}
