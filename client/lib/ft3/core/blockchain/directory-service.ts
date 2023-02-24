import { BufferId } from "../../../cryptoUtils";
import ChainConnectionInfo from "../chain-connection-info";

export default interface DirectoryService {
  getChainConnectionInfo(
    id: BufferId
  ): Promise<ChainConnectionInfo | undefined>;
}
