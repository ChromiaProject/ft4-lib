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
  readonly info: BlockchainInfo;
  readonly connection: ConnectionClient;
  private readonly directoryService: DirectoryService;

  constructor(
    info: BlockchainInfo,
    connection: ConnectionClient,
    directoryService: DirectoryService
  ) {
    this.info = info;
    this.connection = connection;
    this.directoryService = directoryService;
  }

  get id(): Buffer {
    return this.connection.brid;
  }

  static async initialize(
    brid: Buffer,
    directoryService: DirectoryService
  ): Promise<Blockchain> {
    const chainConnectionInfo = await directoryService.getChainConnectionInfo(
      brid
    );
    if (!chainConnectionInfo) {
      throw new Error(
        `Cannot find details for chain with RID: ${brid.toString("hex")}`
      );
    }

    const connection = new ConnectionClient(chainConnectionInfo.url, brid);
    const info = await BlockchainInfo.getInfo(connection);
    return new Blockchain(info, connection, directoryService);
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

  async linkChain(brid: Buffer) {
    await this.transactionBuilder()
      .add(op("ft3.xc.link_chain", brid))
      .build([])
      .post();
  }

  async isLinkedWithChain(brid: Buffer): Promise<boolean> {
    return (
      (await this.query("ft3.xc.is_linked_with_chain", {
        brid: brid,
      })) === 1
    );
  }

  async getLinkedBRIDs(): Promise<Buffer[]> {
    const linkedChains = await this.query("ft3.xc.get_linked_chains", {});
    return linkedChains.map((brid) => Buffer.from(brid, "hex"));
  }

  async getLinkedChains(): Promise<Blockchain[]> {
    const brids = await this.getLinkedBRIDs();
    return new Promise<Blockchain[]>((resolve) => {
      Promise.all<Blockchain>(
        brids.map(
          (brid) =>
            new Promise((resolve) => {
              Blockchain.initialize(brid, this.directoryService)
                .then(resolve)
                .catch(() => {
                  console.warn(
                    `Cannot get info for chain with RID: ${brid.toString(
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
    const tx = await this.transactionBuilder()
      .add(operation)
      .build(user.authDescriptor.signers)
      .sign(user.signatureProvider);
    await tx.post();
  }

  async postRaw(rawTransaction: Buffer): Promise<void> {
    const tx = this.connection.transactionFromRawTransaction(rawTransaction);
    await tx.postAndWaitConfirmation();
  }

  transactionBuilder(): TransactionBuilder {
    return new TransactionBuilder(this);
  }
}
