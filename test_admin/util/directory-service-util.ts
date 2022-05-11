import DirectoryService from "../../client/lib/ft3/core/blockchain/directory-service";
import FakeDirectoryService from "./fake-directory-service";
import ChainConnectionInfo from "../../client/lib/ft3/core/chain-connection-info";

export default class DirectoryServiceUtil {
    static getDefaultDirectoryService(): DirectoryService {
        return new FakeDirectoryService([
            new ChainConnectionInfo(
                Buffer.from(process.env.CHAIN_1_ID, 'hex'),
                process.env.NODE_URL
            )
        ]);
    }
}
