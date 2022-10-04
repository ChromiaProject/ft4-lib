import { DirectoryService, ChainConnectionInfo } from "../../client/lib/ft3";

export default class FakeDirectoryService implements DirectoryService {
  private readonly chainInfos: ChainConnectionInfo[];

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
