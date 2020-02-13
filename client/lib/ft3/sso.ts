
import {Account} from './account';
import { gtx } from 'postchain-client';
import Blockchain from './blockchain';
import Session from "./blockchain-session";
import Transaction from './transaction';
import User from './user';

export default {
  authorize(vaultUrl: string, successUrl: string, cancelUrl: string, user: User, blockchain: Blockchain): string {
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