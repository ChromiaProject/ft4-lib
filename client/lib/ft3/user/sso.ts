
import {Account} from './account';
import Blockchain from '../core/blockchain/blockchain';
import Session from "../core/blockchain/blockchain-session";
import Transaction from '../core/transaction';
import User from './user';

export default {
  initialize(vaultUrl: string, successUrl: string, cancelUrl: string, user: User, blockchain: Blockchain): string {
    return `${vaultUrl}/?route=/authorize&dappId=${
      blockchain.connection.chainId
    }&pubkey=${
      user.keyPair.pubKey.toString('hex')
    }&successAction=${
      encodeURIComponent(successUrl)
    }&cancelAction=${
      encodeURIComponent(cancelUrl)
    }`;
  },

  async execute(rawTx: string, session: Session): Promise<Account[]> {
    await Transaction.fromRawTransaction(Buffer.from(rawTx, 'hex'), session.blockchain)
        .sign(session.user.keyPair)
        .post();
    
    return Account.getByAuthDescriptorId(session.user.authDescriptor.id, session);
  }
}