import {Account, FlagsType} from "../client/lib/ft3/account";
import * as pcl from "postchain-client";
import {buffToHex, KeyPair} from "../client/lib/cyptoUtils";
import TestUser from "./util/test-user";
import SingleSignatureAuthDescriptor from "../client/lib/ft3/auth-descriptor/single-signature-auth-descriptor";
import MultiSignatureAuthDescriptor from "../client/lib/ft3/auth-descriptor/multi-signature-auth-descriptor";
import AccountBuilder from "./util/account-builder";
import BlockchainUtil from "./util/blockchain-util";
import Blockchain from "../client/lib/ft3/blockchain";
import { op } from "../client/lib/ft3";


require('dotenv').config();

let blockchain: Blockchain = null;

describe('Test the account', () => {
    beforeAll(async () => {
        blockchain = await BlockchainUtil.getDefaultBlockchain();
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
       const authDescriptor = new SingleSignatureAuthDescriptor(
           user.keyPair.pubKey,
           [FlagsType.Account, FlagsType.Transfer]
       );

       const account = await Account.register(authDescriptor, blockchain.newSession(user));

       expect(account).not.toBeNull();
    });

    it("can add new auth descriptor if has account edit rights", async () => {
        const user = TestUser.singleSig();
        const account = await AccountBuilder
            .account(blockchain, user)
            .withParticipants([user.keyPair])
            .withPoints(1)
            .build();

        expect(account).not.toBeNull();

        await account.addAuthDescriptor(
            new SingleSignatureAuthDescriptor(user.keyPair.pubKey, [FlagsType.Transfer])
        );
        expect(account.authDescriptor.length).toBe(2);
    });

    it("cannot add new auth descriptor if account doesn't have account edit rights", async () => {
        const user = TestUser.singleSig();
        const account = await Account.register(
            new SingleSignatureAuthDescriptor(user.keyPair.pubKey, [FlagsType.Transfer]),
            blockchain.newSession(user)
        );
        expect(account).not.toBeNull();

        const promise = account.addAuthDescriptor(
            new SingleSignatureAuthDescriptor(user.keyPair.pubKey, [FlagsType.Transfer])
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
            blockchain.newSession(user1)
        );
        expect(account).not.toBeNull();
    });

    //TODO FIX ME
    it.skip("should update account if 2 signatures provided", async () => {
        const user1 = TestUser.singleSig();
        const user2 = TestUser.singleSig();

        const account = await Account.register(
            new MultiSignatureAuthDescriptor(
                [user1.keyPair.pubKey, user2.keyPair.pubKey],
                2,
                [FlagsType.Account, FlagsType.Transfer]
            ),
            blockchain.newSession(user1)
        );
        expect(account).not.toBeNull();

        await account.addAuthDescriptor(
            new SingleSignatureAuthDescriptor(user1.keyPair.pubKey, [FlagsType.Transfer])
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
            blockchain.newSession(user1)
        );
        expect(account).not.toBeNull();

        const promise = account.addAuthDescriptor(
            new SingleSignatureAuthDescriptor(user1.keyPair.pubKey, [FlagsType.Transfer])
        );
        await expect(promise).rejects.toBeInstanceOf(Error);
        expect(account.authDescriptor.length).toBe(1);
    });

    it("should be returned when queried by participant id", async () => {
        const user = TestUser.singleSig();

        await AccountBuilder
            .account(blockchain)
            .withParticipants([user.keyPair])
            .build();

        const accounts = await Account.getByParticipantId(user.keyPair.pubKey, blockchain.newSession(user));

        expect(accounts.length).toEqual(1);
    });

    it("should return two accounts when account is participant of two accounts", async () => {
        const user1 = TestUser.singleSig();
        const user2 = TestUser.singleSig();

        await AccountBuilder
            .account(blockchain)
            .withParticipants([user1.keyPair])
            .build();

        const account2 = await AccountBuilder
            .account(blockchain, user2)
            .withParticipants([user2.keyPair])
            .withPoints(1)
            .build();

        await account2.addAuthDescriptor(
            new SingleSignatureAuthDescriptor(user1.keyPair.pubKey, [FlagsType.Transfer])
        );

        const accounts = await Account.getByParticipantId(user1.keyPair.pubKey, blockchain.newSession(user1));

        expect(accounts.length).toEqual(2);
    });

    it('should return account by id', async () => {
        const user = TestUser.singleSig();

        const account = await AccountBuilder
            .account(blockchain, user)
            .build();

        const foundAccount = await Account.getById(account.id_, blockchain.newSession(user));
        
        expect(account).toEqual(foundAccount);
    });

    it('should have only one auth descriptor after calling deleteAllAuthDescriptorsExclude', async () => {
        const user1 = TestUser.singleSig();
        const user2 = TestUser.singleSig();
        const user3 = TestUser.singleSig();

        const account = await AccountBuilder
            .account(blockchain, user1)
            .withParticipants([user1.keyPair])
            .withPoints(3)
            .build();

        const authDescriptor1 = new SingleSignatureAuthDescriptor(
            user2.keyPair.pubKey,
            [FlagsType.Transfer, FlagsType.Account]
        );

        const authDescriptor2 = new SingleSignatureAuthDescriptor(
            user3.keyPair.pubKey,
            [FlagsType.Account, FlagsType.Transfer]
        );

        await account.addAuthDescriptor(authDescriptor1);
        await account.addAuthDescriptor(authDescriptor2);

        await account.deleteAllAuthDescriptorsExclude(user1.authDescriptor);

        const foundAccount = await blockchain.newSession(user1).getAccountById(account.id_);

        expect(foundAccount.authDescriptor.length).toEqual(1);
    });

    it('should be able to register account by directly calling \'register_account\' operation', async () => {
        const user = TestUser.singleSig();

        await blockchain.call(op('ft3.dev_register_account', user.authDescriptor), user);

        const session = blockchain.newSession(user);
        const account = await session.getAccountById(user.authDescriptor.id);

        expect(account).not.toBeNull();
    })
});