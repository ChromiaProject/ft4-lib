import {
    Account,
    AuthDescriptor,
    AuthType,
    Flags,
    SingleSignatureAuth
} from "../client/lib/ft3/account";
import * as pcl from "postchain-client";
import {buffToHex, KeyPair} from "../client/lib/cyptoUtils";

require('dotenv').config();

describe('Test the account', () => {

    beforeEach(() => {
    });

    it('should be in DEV mode', () => {
        expect(process.env.DEV).toBe('true');
    });

    it("Correctly creates keypair", () => {
        const keyPairToImport = pcl.util.makeKeyPair();
        const user = new KeyPair(buffToHex(keyPairToImport.privKey));
        expect(user.privKey).toEqual(keyPairToImport.privKey);
        expect(user.pubKey).toEqual(keyPairToImport.pubKey);
    });

    it("Register account on blockchain", async () => {
       const user = new KeyPair();
       const authDescriptor = new AuthDescriptor(AuthType.single_sig, new SingleSignatureAuth(new Flags(true, true), user.pubKey))
       const account = new Account([authDescriptor]);

       const tx = account.register(user.newTx());
       tx.sign(user.privKey, user.pubKey);
       const sent = tx.postAndWaitConfirmation();
       await expect(sent).resolves.toBe(null);
    });
});