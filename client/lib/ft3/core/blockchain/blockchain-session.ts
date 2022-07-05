import Blockchain from "./blockchain";
import User from "../../user/user";
import MutableAccount from "../../user/mutable-account";
import Operation from "../operation";

export default class BlockchainSession {
  readonly user: User;
  readonly blockchain: Blockchain;

  constructor(user: User, blockchain: Blockchain) {
    this.user = user;
    this.blockchain = blockchain;
  }

  async getAccountById(id: Buffer): Promise<MutableAccount> {
    return await MutableAccount.getById(id, this);
  }

  async getAccountsByParticipantId(id: Buffer): Promise<MutableAccount[]> {
    return await MutableAccount.getByParticipantId(id, this);
  }

  async getAccountsByAuthDescriptorId(id: Buffer): Promise<MutableAccount[]> {
    return await MutableAccount.getByAuthDescriptorId(id, this);
  }

  async query(name: string, params: any): Promise<any> {
    return await this.blockchain.query(name, params);
  }

  async call(operation: Operation): Promise<any> {
    return await this.blockchain.call(operation, this.user);
  }
}
