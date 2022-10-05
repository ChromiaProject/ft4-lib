import { Blockchain, Postchain } from "../../client/lib/ft3";
import { config } from "dotenv";
config();

export default class BlockchainUtil {
  static async getDefaultBlockchain(): Promise<Blockchain> {
    return await new Postchain(
      process.env.TEST_NODE_URL || "http://localhost:7741"
    ).blockchain(1);
  }
}
