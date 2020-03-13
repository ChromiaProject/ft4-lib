import DirectoryServiceBase from "./blockchain/directory-service-base";
import ChainConnectionInfo from "./chain-connection-info";
import Blockchain from "./blockchain/blockchain";

export default class Postchain {
    constructor(readonly url: string) {}

    async blockchain(id: Buffer | string): Promise<Blockchain> {
        const blockchainId = id instanceof Buffer ? id : Buffer.from(id, 'hex');

        const directoryService = new DirectoryServiceBase([
            new ChainConnectionInfo(blockchainId, this.url)
        ]);

        return await Blockchain.initialize(blockchainId, directoryService);
    }
}