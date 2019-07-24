import {
    Account,
    FlagsType,
    MultiSignatureAuthDescriptor,
    SingleSignatureAuthDescriptor,
} from "../client/lib/ft3/account";
import * as pcl from "postchain-client";
import {buffToHex, KeyPair} from "../client/lib/cyptoUtils";
import {gtx} from '../client/blockchain';

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
       const authDescriptor = new SingleSignatureAuthDescriptor(user.pubKey, [FlagsType.Account, FlagsType.Transfer]);
       const account = await Account.register(authDescriptor, [user], gtx);
       expect(account).not.toBeNull();
    });

    it("can add new auth descriptor if has account edit rights", async () => {
        const user = new KeyPair();
        const account = await Account.register(
            new SingleSignatureAuthDescriptor(user.pubKey, [FlagsType.Account, FlagsType.Transfer]),
            [user],
            gtx
        );
        expect(account).not.toBeNull();

        await account.addAuthDescriptor(
            new SingleSignatureAuthDescriptor(user.pubKey, [FlagsType.Transfer]),
            [user],
            gtx
        );
        expect(account.authDescriptor.length).toBe(2);
    });

    it("cannot add new auth descriptor if account doesn't have account edit rights", async () => {
        const user = new KeyPair();
        const account = await Account.register(
            new SingleSignatureAuthDescriptor(user.pubKey, [FlagsType.Transfer]),
            [user],
            gtx
        );
        expect(account).not.toBeNull();

        const promise = account.addAuthDescriptor(
            new SingleSignatureAuthDescriptor(user.pubKey, [FlagsType.Transfer]),
            [user],
            gtx
        );
        await expect(promise).rejects.toBeInstanceOf(Error);
        expect(account.authDescriptor.length).toBe(1);
    });

    it("should create new multisig account", async () => {
        const user1 = new KeyPair();
        const user2 = new KeyPair();

        const account = await Account.register(
            new MultiSignatureAuthDescriptor(
                [user1.pubKey, user2.pubKey],
                2,
                [FlagsType.Account, FlagsType.Transfer]
            ),
            [user1, user2],
            gtx
        );
        expect(account).not.toBeNull();
    });

    it("should update account if 2 signatures provided", async () => {
        const user1 = new KeyPair();
        const user2 = new KeyPair();

        const account = await Account.register(
            new MultiSignatureAuthDescriptor(
                [user1.pubKey, user2.pubKey],
                2,
                [FlagsType.Account, FlagsType.Transfer]
            ),
            [user1, user2],
            gtx
        );
        expect(account).not.toBeNull();

        await account.addAuthDescriptor(
            new SingleSignatureAuthDescriptor(user1.pubKey, [FlagsType.Transfer]),
            [user1, user2],
            gtx
        );
        expect(account.authDescriptor.length).toBe(2);
    });

    it("should fail if only one signature provided", async () => {
        const user1 = new KeyPair();
        const user2 = new KeyPair();

        const account = await Account.register(
            new MultiSignatureAuthDescriptor(
                [user1.pubKey, user2.pubKey],
                2,
                [FlagsType.Account, FlagsType.Transfer]
            ),
            [user1, user2],
            gtx
        );
        expect(account).not.toBeNull();

        const promise = account.addAuthDescriptor(
            new SingleSignatureAuthDescriptor(user1.pubKey, [FlagsType.Transfer]),
            [user1],
            gtx
        );
        await expect(promise).rejects.toBeInstanceOf(Error);
        expect(account.authDescriptor.length).toBe(1);
    });
});