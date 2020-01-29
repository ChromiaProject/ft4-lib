import Blockchain from "../../client/lib/ft3/blockchain";
import DirectoryServiceUtil from "./directory-service-util";

require('dotenv').config();

export default class BlockchainUtil {
    static async getDefaultBlockchain(): Promise<Blockchain> {
        return await Blockchain.initialize(
            Buffer.from(process.env.CHAIN_ID, 'hex'),
            DirectoryServiceUtil.getDefaultDirectoryService()
        )
    }
}