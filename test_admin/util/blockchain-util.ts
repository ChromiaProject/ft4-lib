import Blockchain from "../../client/lib/ft3/core/blockchain/blockchain";
import Postchain from "../../client/lib/ft3/core/postchain";

require("dotenv").config(); /*I don't know how to fix if it needs to be fixed*/ // eslint-disable-line @typescript-eslint/no-var-requires

export default class BlockchainUtil {
  static async getDefaultBlockchain(): Promise<Blockchain> {
    return await new Postchain(
      process.env.TEST_NODE_URL || "http://localhost:7741"
    ).blockchain(1);
  }
}
