import {
  Blockchain,
  ConnectionClient,
  Postchain,
  DirectoryServiceBase,
  ChainConnectionInfo,
  Asset,
} from "../../client/lib/ft3";
import { generateAssetName, generateId } from "./util";
import { config } from "dotenv";
config();

export default class BlockchainUtil {
  static async getDefaultBlockchain(): Promise<Blockchain> {
    return await new Postchain([
      process.env.TEST_NODE_URL || "http://localhost:7741",
    ]).blockchain(0);
  }

  static getNewBlockchain(): Blockchain {
    const id = generateId();
    return new Blockchain(
      new ConnectionClient(["URL"], id.toString("hex")),
      new DirectoryServiceBase([new ChainConnectionInfo(id, ["URL"])])
    );
  }

  static async getNewAsset(
    blockchain: Blockchain,
    name = generateAssetName(),
    brid = generateId()
  ): Promise<Asset> {
    return await Asset.register(name, brid, blockchain);
  }
}
