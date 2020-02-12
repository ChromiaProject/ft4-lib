
import {Account} from './account';
import { gtx } from 'postchain-client';
import Blockchain from './blockchain';
import Session from "./blockchain-session";
import Transaction from './transaction';
import User from './user';

export default {
  
  initialize (vaultUrl: string, successUrl: string, cancelUrl: string, user: User, blockchain: Blockchain): string {
    successUrl = encodeURIComponent(successUrl);
    cancelUrl = encodeURIComponent(cancelUrl);

    return `${vaultUrl}/?route=/authorize&dappId=${blockchain.connection.chainId}&pubkey=${user.keyPair.pubKey.toString('hex')}&successAction=${successUrl}&cancelAction=${cancelUrl}`;
  },

  async execute(rawTx: string, session: Session): Promise<Account[]> {
    const rawTxBuffer = Buffer.from(rawTx, 'hex');
    const registerAuthDescriptorResult = gtx.signRawTransaction(session.user.keyPair, rawTxBuffer)
    const res = Transaction.importRawTransaction(registerAuthDescriptorResult, session.blockchain)
    
    await res.post();
    return Account.getByAuthDescriptorId(session.user.authDescriptor.hash(), session); 
  }
}