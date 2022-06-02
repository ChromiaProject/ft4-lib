import Blockchain from "../../client/lib/ft3/core/blockchain/blockchain";
import Postchain from "../../client/lib/ft3/core/postchain";

require('dotenv').config();

export default class BlockchainUtil {
    static async getDefaultBlockchain(): Promise<Blockchain> {
        return await new Postchain(process.env.NODE_URL || "http://localhost:7740").blockchain(0);
    }
}
