import DirectoryService from "../../client/lib/ft3/directory-service";
import ChainConnectionInfo from "../../client/lib/ft3/chain-connection-info";

export default class FakeDirectoryService implements DirectoryService {
    private readonly chainInfos: ChainConnectionInfo[];

    constructor(chainInfos: ChainConnectionInfo[]) {
        this.chainInfos = chainInfos;
    }

    async getChainConnectionInfo(id: Buffer): Promise<ChainConnectionInfo | null> {
        return this.chainInfos.find(info => info.chainId.toString('hex') === id.toString('hex'));
    }

}