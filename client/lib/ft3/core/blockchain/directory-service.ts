import { Id } from "../../../cryptoUtils";
import ChainConnectionInfo from "../chain-connection-info";

export default interface DirectoryService {
  getChainConnectionInfo(id: Id): Promise<ChainConnectionInfo | undefined>;
}
