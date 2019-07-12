import Account from "../client/lib/ft3/account";

require('dotenv').config();

import * as pcl from "postchain-client";
import {buffToHex, hexToBuff, KeyPair} from "../client/lib/cyptoUtils";

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
       const account = new Account();
       const user = new KeyPair();
       const tx = account.register(user.newTx());
       const sent = tx.postAndWaitConfirmation();
       await expect(sent).resolves.toBe(null);
    });
});