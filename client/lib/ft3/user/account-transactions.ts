import BlockchainSession from "../core/blockchain/blockchain-session";
import Transaction from "../core/transaction";
import {
  transfer,
  addAuthDescriptor,
  nop,
  deleteAllAuthDescriptorsExclude,
  xcTransfer,
  deleteAuthDescriptor,
} from "./account-operations";
import AuthDescriptorRule from "./auth-descriptor/auth-descriptor-rule";
import Operation from "../core/operation";

type PubKey = Buffer;

interface GtvSerializable {
  toGTV(): any[];
}

interface AuthDescriptor extends GtvSerializable {
  id: Buffer;
  signers: PubKey[];
  rule: AuthDescriptorRule | null;
  hash(): Buffer;
}

export default class AccountTransactions {
  readonly id: Buffer;
  readonly session: BlockchainSession;

  constructor(id: Buffer, session: BlockchainSession) {
    this.id = id;
    this.session = session;
  }

  async addAuthDescriptor(
    authDescriptor: AuthDescriptor
  ): Promise<Transaction> {
    return await this.session.blockchain
      .transactionBuilder()
      .add(
        addAuthDescriptor(
          this.id,
          this.session.user.authDescriptor.id,
          authDescriptor
        )
      )
      .add(nop())
      .build(
        [
          this.session.user.authDescriptor.signers,
          authDescriptor.signers,
        ].flat()
      )
      .sign(this.session.user.signatureProvider);
  }

  async deleteAllAuthDescriptorsExclude(
    authDescriptor: AuthDescriptor
  ): Promise<Transaction> {
    return await this.session.blockchain
      .transactionBuilder()
      .add(deleteAllAuthDescriptorsExclude(this.id, authDescriptor.id))
      .buildAndSign(this.session.user);
  }

  async deleteAuthDescriptor(
    authDescriptor: AuthDescriptor
  ): Promise<Transaction> {
    return await this.session.blockchain
      .transactionBuilder()
      .add(
        deleteAuthDescriptor(
          this.id,
          this.session.user.authDescriptor.id,
          authDescriptor.id
        )
      )
      .buildAndSign(this.session.user);
  }

  async transferInputsToOutputs(
    inputs: Array<GtvSerializable>,
    outputs: Array<GtvSerializable>
  ): Promise<Transaction> {
    return await this.session.blockchain
      .transactionBuilder()
      .add(transfer(inputs, outputs))
      .add(nop())
      .buildAndSign(this.session.user);
  }

  async xcTransfer(
    destinationBRID: Buffer,
    destinationAccountId: Buffer,
    assetId: Buffer,
    amount: number
  ): Promise<Transaction> {
    return await this.session.blockchain
      .transactionBuilder()
      .add(
        this.xcTransferOp(
          destinationBRID,
          destinationAccountId,
          assetId,
          amount
        )
      )
      .add(nop())
      .buildAndSign(this.session.user);
  }

  /* Operation */

  xcTransferOp(
    destinationBRID: Buffer,
    destinationAccountId: Buffer,
    assetId: Buffer,
    amount: number
  ): Operation {
    const source = [
      this.id,
      assetId,
      this.session.user.authDescriptor.id,
      amount,
      [],
    ];
    const target = [destinationAccountId, []];
    const hops = [destinationBRID];

    return xcTransfer(source, target, hops);
  }
}
