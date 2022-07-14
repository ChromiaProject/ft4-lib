import BlockchainInfo from "./blockchain-info";
import ConnectionClient from "../connection-client";
import { AuthDescriptor } from "../../user/account-utils";
import StaticAccount from "../../user/static-account";
import MutableAccount from "../../user/mutable-account";
import Asset from "../../user/asset";
import DirectoryService from "./directory-service";
import TransactionBuilder from "../transaction-builder";
import BlockchainSession from "./blockchain-session";
import User from "../../user/user";
import Operation from "../operation";
import { op } from "../../user/account-operations";

export default class Blockchain {
  readonly id: Buffer;
  readonly info: BlockchainInfo;
  readonly connection: ConnectionClient;
  private readonly directoryService: DirectoryService;

  constructor(
    id: Buffer,
    info: BlockchainInfo,
    connection: ConnectionClient,
    directoryService: DirectoryService
  ) {
    if (id.toString("hex").toLowerCase() !== connection.chainId.toLowerCase()) {
      throw new Error(
        `Invalid ConnectionClient (BRID: ${
          connection.chainId
        }). Expected BRID: ${id.toString("hex")}`
      );
    }
    this.id = id;
    this.info = info;
    this.connection = connection;
    this.directoryService = directoryService;
  }

  static async initialize(
    blockchainRID: Buffer,
    directoryService: DirectoryService
  ): Promise<Blockchain> {
    const chainConnectionInfo = await directoryService.getChainConnectionInfo(
      blockchainRID
    );
    if (!chainConnectionInfo) {
      throw new Error(
        `Cannot find details for chain with RID: ${blockchainRID.toString(
          "hex"
        )}`
      );
    }

    const connection = new ConnectionClient(
      chainConnectionInfo.url,
      blockchainRID.toString("hex")
    );
    const info = await BlockchainInfo.getInfo(connection);
    return new Blockchain(blockchainRID, info, connection, directoryService);
  }

  newSession(user: User): BlockchainSession {
    return new BlockchainSession(user, this);
  }

  async getAccountById(id: Buffer): Promise<StaticAccount> {
    return await StaticAccount.getById(id, this);
  }

  async getAccountsByParticipantId(id: Buffer): Promise<StaticAccount[]> {
    return await StaticAccount.getByParticipantId(id, this);
  }

  async getAccountsByAuthDescriptorId(id: Buffer): Promise<StaticAccount[]> {
    return await StaticAccount.getByAuthDescriptorId(id, this);
  }

  async registerAccount(
    authDescriptor: AuthDescriptor,
    user
  ): Promise<MutableAccount> {
    return await MutableAccount.register(authDescriptor, this.newSession(user));
  }

  async getAssetsByName(name): Promise<Asset[]> {
    return await Asset.getByName(name, this);
  }

  async getAssetById(id: Buffer): Promise<Asset> {
    return await Asset.getById(id, this);
  }

  async getAllAssets(): Promise<Asset[]> {
    return await Asset.getAssets(this);
  }

  async linkChain(chainId: Buffer) {
    await this.transactionBuilder()
      .add(op("ft3.xc.link_chain", chainId))
      .build([])
      .post();
  }

  async isLinkedWithChain(chainId: Buffer): Promise<boolean> {
    return (
      (await this.query("ft3.xc.is_linked_with_chain", {
        chain_rid: chainId,
      })) === 1
    );
  }

  async getLinkedChainsIds(): Promise<Buffer[]> {
    const linkedChains = await this.query("ft3.xc.get_linked_chains", {});
    return linkedChains.map((chainId) => Buffer.from(chainId, "hex"));
  }

  async getLinkedChains(): Promise<Blockchain[]> {
    const chainIds = await this.getLinkedChainsIds();
    return new Promise<Blockchain[]>((resolve) => {
      Promise.all<Blockchain>(
        chainIds.map(
          (chainId) =>
            new Promise((resolve) => {
              Blockchain.initialize(chainId, this.directoryService)
                .then(resolve)
                .catch(() => {
                  console.warn(
                    `Cannot get info for chain with RID: ${chainId.toString(
                      "hex"
                    )}`
                  );
                  resolve(null);
                });
            })
        )
      ).then((chains) => {
        resolve(chains.filter((chain) => chain));
      });
    });
  }

  async query(name: string, params: any): Promise<any> {
    return await this.connection.query(name, params);
  }

  async call(operation: Operation, user: User): Promise<void> {
    await this.transactionBuilder()
      .add(operation)
      .build(user.authDescriptor.signers)
      .sign(user.keyPair)
      .post();
  }

  async postRaw(rawTransaction: Buffer): Promise<void> {
    const tx = this.connection.transactionFromRawTransaction(rawTransaction);
    await tx.postAndWaitConfirmation();
  }

  transactionBuilder(): TransactionBuilder {
    return new TransactionBuilder(this);
  }
}
