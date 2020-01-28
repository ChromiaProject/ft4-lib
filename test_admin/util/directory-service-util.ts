import DirectoryService from "../../client/lib/ft3/directory-service";
import FakeDirectoryService from "./fake-directory-service";
import ChainConnectionInfo from "../../client/lib/ft3/chain-connection-info";

export default class DirectoryServiceUtil {
    static getDefaultDirectoryService(): DirectoryService {
        return new FakeDirectoryService([
            new ChainConnectionInfo(
                Buffer.from(process.env.CHAIN_ID, 'hex'),
                process.env.NODE_URL
            )
        ]);
    }
}