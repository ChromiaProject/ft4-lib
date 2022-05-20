import Blockchain from "../../client/lib/ft3/core/blockchain/blockchain";
import Postchain from "../../client/lib/ft3/core/postchain";
import DirectoryServiceUtil from "./directory-service-util";

require('dotenv').config();

export default class BlockchainUtil {
    static async getDefaultBlockchain(): Promise<Blockchain> {
        return await new Postchain(process.env.NODE_URL).blockchain(0);
    }
}
