import Blockchain from "../../client/lib/ft3/core/blockchain/blockchain";
import BlockchainInfo from "../../client/lib/ft3/core/blockchain/blockchain-info";
import ConnectionClient from '../../client/lib/ft3/core/connection-client';
import RateLimitInfo from "../../client/lib/ft3/core/blockchain/rate-limit-info";
import Postchain from "../../client/lib/ft3/core/postchain";
import DirectoryServiceBase from "../../client/lib/ft3/core/blockchain/directory-service-base";
import ChainConnectionInfo from "../../client/lib/ft3/core/chain-connection-info";
import { generateId } from "./util";

require('dotenv').config();

export default class BlockchainUtil {
    static async getDefaultBlockchain(): Promise<Blockchain> {
        return await new Postchain(process.env.NODE_URL).blockchain(0);
    }

    static getNewBlockchain(): Blockchain {
        let rateLimit = new RateLimitInfo(false, null, null, null)
        let id = generateId();
        return new Blockchain(
            id,
            new BlockchainInfo("name", "website", "description", rateLimit),
            new ConnectionClient("URL", id.toString('hex')),
            new DirectoryServiceBase([
                new ChainConnectionInfo(id, "URL")
            ])
        )
    }
}
