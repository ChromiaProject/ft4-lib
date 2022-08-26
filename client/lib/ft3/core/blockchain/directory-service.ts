import ChainConnectionInfo from "../chain-connection-info";

export default interface DirectoryService {
  getChainConnectionInfo(id: Buffer): Promise<ChainConnectionInfo | undefined>;
}
