import { Account, FlagsType } from "../client/lib/ft3/account";
import * as pcl from "postchain-client";
import {buffToHex, KeyPair} from "../client/lib/cyptoUtils";
import TestConnection from "./util/test-connection";
import TestUser from "./util/test-user";
import SingleSignatureAuthDescriptor from "../client/lib/ft3/auth-descriptor/signle-signature-auth-descriptor";
import MultiSignatureAuthDescriptor from "../client/lib/ft3/auth-descriptor/multi-signature-auth-descriptor";

require('dotenv').config();

const connection = new TestConnection();

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
       const user = TestUser.singleSig();
       const authDescriptor = new SingleSignatureAuthDescriptor(user.keyPair.pubKey, [FlagsType.Account, FlagsType.Transfer]);
       const account = await Account.register(authDescriptor, [user.keyPair], user, connection);
       expect(account).not.toBeNull();
    });

    it("can add new auth descriptor if has account edit rights", async () => {
        const user = TestUser.singleSig();
        const account = await Account.register(
            new SingleSignatureAuthDescriptor(user.keyPair.pubKey, [FlagsType.Account, FlagsType.Transfer]),
            [user.keyPair],
            user,
            connection
        );
        expect(account).not.toBeNull();

        await account.addAuthDescriptor(
            new SingleSignatureAuthDescriptor(user.keyPair.pubKey, [FlagsType.Transfer]),
            [user.keyPair]
        );
        expect(account.authDescriptor.length).toBe(2);
    });

    it("cannot add new auth descriptor if account doesn't have account edit rights", async () => {
        const user = TestUser.singleSig();
        const account = await Account.register(
            new SingleSignatureAuthDescriptor(user.keyPair.pubKey, [FlagsType.Transfer]),
            [user.keyPair],
            user,
            connection
        );
        expect(account).not.toBeNull();

        const promise = account.addAuthDescriptor(
            new SingleSignatureAuthDescriptor(user.keyPair.pubKey, [FlagsType.Transfer]),
            [user.keyPair]
        );
        await expect(promise).rejects.toBeInstanceOf(Error);
        expect(account.authDescriptor.length).toBe(1);
    });

    it("should create new multisig account", async () => {
        const user1 = TestUser.singleSig();
        const user2 = TestUser.singleSig();

        const account = await Account.register(
            new MultiSignatureAuthDescriptor(
                [user1.keyPair.pubKey, user2.keyPair.pubKey],
                2,
                [FlagsType.Account, FlagsType.Transfer]
            ),
            [user1.keyPair, user2.keyPair],
            user1,
            connection
        );
        expect(account).not.toBeNull();
    });

    it("should update account if 2 signatures provided", async () => {
        const user1 = TestUser.singleSig();
        const user2 = TestUser.singleSig();

        const account = await Account.register(
            new MultiSignatureAuthDescriptor(
                [user1.keyPair.pubKey, user2.keyPair.pubKey],
                2,
                [FlagsType.Account, FlagsType.Transfer]
            ),
            [user1.keyPair, user2.keyPair],
            user1,
            connection
        );
        expect(account).not.toBeNull();

        await account.addAuthDescriptor(
            new SingleSignatureAuthDescriptor(user1.keyPair.pubKey, [FlagsType.Transfer]),
            [user1.keyPair, user2.keyPair]
        );
        expect(account.authDescriptor.length).toBe(2);
    });

    it("should fail if only one signature provided", async () => {
        const user1 = TestUser.singleSig();
        const user2 = TestUser.singleSig();

        const account = await Account.register(
            new MultiSignatureAuthDescriptor(
                [user1.keyPair.pubKey, user2.keyPair.pubKey],
                2,
                [FlagsType.Account, FlagsType.Transfer]
            ),
            [user1.keyPair, user2.keyPair],
            user1,
            connection
        );
        expect(account).not.toBeNull();

        const promise = account.addAuthDescriptor(
            new SingleSignatureAuthDescriptor(user1.keyPair.pubKey, [FlagsType.Transfer]),
            [user1.keyPair]
        );
        await expect(promise).rejects.toBeInstanceOf(Error);
        expect(account.authDescriptor.length).toBe(1);
    });
});