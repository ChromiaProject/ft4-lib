import { formatter } from "postchain-client";
import {
  DirectoryService,
  ChainConnectionInfo,
  BufferId,
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
      (info) => info.brid.compare(formatter.ensureBuffer(id)) === 0
    );
  }
}
