import {
  DirectoryService,
  ChainConnectionInfo,
  BufferId,
  ensureBuffer,
} from "../../client/lib/ft3";

export default class FakeDirectoryService implements DirectoryService {
  private readonly chainInfos: ChainConnectionInfo[];

  constructor(chainInfos: ChainConnectionInfo[]) {
    this.chainInfos = chainInfos;
  }

  async getChainConnectionInfo(
    id: BufferId
  ): Promise<ChainConnectionInfo | undefined> {
    return this.chainInfos.find(
      (info) => info.brid.compare(ensureBuffer(id)) === 0
    );
  }
}
