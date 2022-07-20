import Blockchain from "../../client/lib/ft3/core/blockchain/blockchain";
import BlockchainInfo from "../../client/lib/ft3/core/blockchain/blockchain-info";
import ConnectionClient from "../../client/lib/ft3/core/connection-client";
import RateLimitInfo from "../../client/lib/ft3/core/blockchain/rate-limit-info";
import Postchain from "../../client/lib/ft3/core/postchain";
import DirectoryServiceBase from "../../client/lib/ft3/core/blockchain/directory-service-base";
import ChainConnectionInfo from "../../client/lib/ft3/core/chain-connection-info";
import { generateId } from "./util";

require("dotenv").config(); /*I don't know how to fix if it needs to be fixed*/ // eslint-disable-line @typescript-eslint/no-var-requires

export default class BlockchainUtil {
  static async getDefaultBlockchain(): Promise<Blockchain> {
    return await new Postchain(
      process.env.TEST_NODE_URL || "http://localhost:7741"
    ).blockchain(0);
  }

  static getNewBlockchain(): Blockchain {
    const rateLimit = new RateLimitInfo(false, null, null, null);
    const id = generateId();
    return new Blockchain(
      new BlockchainInfo("name", "website", "description", rateLimit),
      new ConnectionClient("URL", id.toString("hex")),
      new DirectoryServiceBase([new ChainConnectionInfo(id, "URL")])
    );
  }
}
