import TestUser from "./util/test-user";
import AccountBuilder from "./util/account-builder";
import BlockchainUtil from "./util/blockchain-util";
import Blockchain from "../client/lib/ft3/blockchain";
import Asset from "../client/lib/ft3/asset";
import {generateAssetName, generateId} from "./util/util";
import { Account } from "../client/lib/ft3/account"
import User from "../client/lib/ft3/user";
import { Rules } from "../client/lib/ft3/auth-descriptor/auth-descriptor-rule"

let blockchain: Blockchain = null;
let asset: Asset = null;

function sourceAccount(user: User): Promise<Account> {
    return AccountBuilder
        .account(blockchain, user)
        .withBalance(asset,200)
        .build();
}

function destinationAccount(): Promise<Account> {
    return AccountBuilder
        .account(blockchain)
        .build();
}


describe("Auth Descriptor Rule", () => {
    beforeAll(async () => {
        blockchain = await BlockchainUtil.getDefaultBlockchain();
        asset = await Asset.register(generateAssetName(), generateId(), blockchain);
    });

    it("should succeed when calling operations, number of times less than or equal to value set by operation count rule", async () => {
        const user = TestUser.singleSig(Rules.operationCount.lessOrEqual(2));

        const account1 = await sourceAccount(user);
        const account2 = await destinationAccount();

        const op1Promise = account1.transfer(account2.id, asset.id, 10);
        await expect(op1Promise).resolves.not.toThrowError();

        const op2Promise = account1.transfer(account2.id, asset.id, 20);
        await expect(op2Promise).resolves.not.toThrowError();
    });

    it("should fail when calling operations, number of times more than value set by operation count rule", async () => {
        const user = TestUser.singleSig(Rules.operationCount.lessThan(2));

        const account1 = await sourceAccount(user);
        const account2 = await destinationAccount();

        const op1Promise = account1.transfer(account2.id, asset.id, 10);
        await expect(op1Promise).resolves.not.toThrowError();

        const op2Promise = account1.transfer(account2.id, asset.id, 20);
        await expect(op2Promise).rejects.toThrowError()
    });

    it("should fail when current time is greater than time defined by 'less than' block time rule", async () => {
        const user = TestUser.singleSig(Rules.blockTime.lessThan(Date.now() - 10000));

        const account1 = await sourceAccount(user);
        const account2 = await destinationAccount();

        const opPromise = account1.transfer(account2.id, asset.id, 10);
        await expect(opPromise).rejects.toThrowError()
    });

    it("should succeed when current time is less than time defined by 'less than' block time rule", async () => {
        const user = TestUser.singleSig(Rules.blockTime.lessThan(Date.now() + 10000));

        const account1 = await sourceAccount(user);
        const account2 = await destinationAccount();

        const opPromise = account1.transfer(account2.id, asset.id, 10);
        await expect(opPromise).resolves.not.toThrowError()
    });

    it("should succeed when current block height is less than value defined by 'less than' block height rule", async () => {
        const user = TestUser.singleSig(Rules.blockHeight.lessThan(10000));

        const account1 = await sourceAccount(user);
        const account2 = await destinationAccount();

        const opPromise = account1.transfer(account2.id, asset.id, 10);
        await expect(opPromise).resolves.not.toThrowError()
    });

    it("should fail when current block height is greater than value defined by 'less than' block height rule", async () => {
        const user = TestUser.singleSig(Rules.blockHeight.lessThan(1));

        const account1 = await sourceAccount(user);
        const account2 = await destinationAccount();

        const opPromise = account1.transfer(account2.id, asset.id, 10);
        await expect(opPromise).rejects.toThrowError()
    });

    it("should fail if operation is executed before timestamp defined by 'greater than' block time rule", async () => {
        const user = TestUser.singleSig(Rules.blockTime.greaterThan(Date.now() + 10000));

        const account1 = await sourceAccount(user);
        const account2 = await destinationAccount();

        const opPromise = account1.transfer(account2.id, asset.id, 10);
        await expect(opPromise).rejects.toThrowError()
    });

    it("should succeed if operation is executed after timestamp defined by 'greater than' block time rule", async () => {
        const user = TestUser.singleSig(Rules.blockTime.greaterThan(Date.now() - 10000));

        const account1 = await sourceAccount(user);
        const account2 = await destinationAccount();

        const opPromise = account1.transfer(account2.id, asset.id, 10);
        await expect(opPromise).resolves.not.toThrowError()
    });

    it("should fail if operation is executed before block defined by 'greater than' block height rule", async () => {
        const user = TestUser.singleSig(Rules.blockHeight.greaterThan(10000));

        const account1 = await sourceAccount(user);
        const account2 = await destinationAccount();

        const opPromise = account1.transfer(account2.id, asset.id, 10);
        await expect(opPromise).rejects.toThrowError();
    });

    it("should succeed if operation is executed after block defined by 'greater than' block height rule", async () => {
        const user = TestUser.singleSig(Rules.blockHeight.greaterThan(1));

        const account1 = await sourceAccount(user);
        const account2 = await destinationAccount();

        const opPromise = account1.transfer(account2.id, asset.id, 10);
        await expect(opPromise).resolves.not.toThrowError()
    });

    it("should be able to create complex rules", async () => {
        const user = TestUser.singleSig(Rules.blockHeight.greaterThan(1).and.blockHeight.lessThan(10000));

        const account1 = await sourceAccount(user);
        const account2 = await destinationAccount();

        const opPromise = account1.transfer(account2.id, asset.id, 10);
        await expect(opPromise).resolves.not.toThrowError()
    });

    it("should fail if block heights defined by 'greater than' and 'less than' block height rules are less than current block height", async () => {
        const user = TestUser.singleSig(Rules.blockHeight.greaterThan(1).and.blockHeight.lessThan(10));

        const account1 = await sourceAccount(user);
        const account2 = await destinationAccount();

        const opPromise = account1.transfer(account2.id, asset.id, 10);
        await expect(opPromise).rejects.toThrowError();
    });

    it("should fail if block times defined by 'greater than' and 'less than' block time rules are in the past", async () => {
        const user = TestUser.singleSig(
            Rules.blockTime.greaterThan(Date.now() - 20000).and.blockTime.lessThan(Date.now() - 10000)
        );

        const account1 = await sourceAccount(user);
        const account2 = await destinationAccount();

        const opPromise = account1.transfer(account2.id, asset.id, 10);
        await expect(opPromise).rejects.toThrowError();
    });

    it("should succeed if current time is within period defined by 'greater than' and 'less than' block time rules", async () => {
        const user = TestUser.singleSig(
            Rules.blockTime.greaterThan(Date.now() - 10000).and.blockTime.lessThan(Date.now() + 10000)
        );

        const account1 = await sourceAccount(user);
        const account2 = await destinationAccount();

        const opPromise = account1.transfer(account2.id, asset.id, 10);
        await expect(opPromise).resolves.not.toThrowError()
    });

    it("should delete expired auth descriptor", async () => {
        const user1 = TestUser.singleSig();
        const user2 = TestUser.singleSig(Rules.operationCount.lessThan(2));

        const srcAccount1 = await sourceAccount(user1);
        const destAccount = await destinationAccount();

        // add expiring auth descriptor to the account
        await srcAccount1.addAuthDescriptor(user2.authDescriptor);

        // get the same account, but initialized with user2
        // object which contains expiring auth descriptor
        const srcAccount2 = await blockchain.newSession(user2).getAccountById(srcAccount1.id);

        await srcAccount2.transfer(destAccount.id, asset.id, 10);

        // account descriptor used by user2 object has expired.
        // this operation call will delete it.
        // any other operation, which calls require_auth internally
        // would also delete expired auth descriptor.
        await srcAccount1.transfer(destAccount.id, asset.id, 30);

        await srcAccount1.sync();

        expect(srcAccount1.authDescriptor.length).toEqual(1);
    });

    it("shouldn't delete non-expired auth descriptor", async () => {
        const user1 = TestUser.singleSig();
        const user2 = TestUser.singleSig(Rules.operationCount.lessThan(10));

        const srcAccount1 = await sourceAccount(user1);
        const destAccount = await destinationAccount();

        // add expiring auth descriptor to the account
        await srcAccount1.addAuthDescriptor(user2.authDescriptor);

        // get the same account, but initialized with user2
        // object which contains expiring auth descriptor
        const srcAccount2 = await blockchain.newSession(user2).getAccountById(srcAccount1.id);

        // perform transfer with expiring auth descriptor.
        // auth descriptor didn't expire, because it's only used 1 out of 10 times.
        await srcAccount2.transfer(destAccount.id, asset.id, 10);

        // perform transfer using auth descriptor without rules
        await srcAccount1.transfer(destAccount.id, asset.id, 10);

        await srcAccount1.sync();

        expect(srcAccount1.authDescriptor.length).toEqual(2);
    });

    it("should delete only expired auth descriptor if multiple expiring descriptors exist", async () => {
        const user1 = TestUser.singleSig();
        const user2 = TestUser.singleSig(Rules.operationCount.lessOrEqual(1));
        const user3 = TestUser.singleSig(Rules.operationCount.lessOrEqual(1));

        const srcAccount1 = await sourceAccount(user1);
        const destAccount = await destinationAccount();

        await srcAccount1.addAuthDescriptor(user2.authDescriptor);
        await srcAccount1.addAuthDescriptor(user3.authDescriptor);

        const srcAccount2 = await blockchain.newSession(user2).getAccountById(srcAccount1.id);

        await srcAccount2.transfer(destAccount.id, asset.id, 50);

        // this call will trigger deletion of expired auth descriptor (attached to user2)
        await srcAccount1.transfer(destAccount.id, asset.id, 100);

        await srcAccount1.sync();

        expect(srcAccount1.authDescriptor.length).toEqual(2);
    });

    it("should add auth descriptors", async () => {
        const user1 = TestUser.singleSig();
        const user2 = TestUser.singleSig(Rules.operationCount.lessOrEqual(1));
        const user3 = TestUser.singleSig(Rules.operationCount.lessOrEqual(1));

        const account = await sourceAccount(user1);

        await account.addAuthDescriptor(user2.authDescriptor);
        await account.addAuthDescriptor(user3.authDescriptor);

        await account.sync();

        expect(account.authDescriptor.length).toEqual(3);
    });

    it("should delete auth descriptors", async () => {
        const user1 = TestUser.singleSig();
        const user2 = TestUser.singleSig(Rules.operationCount.lessOrEqual(1));
        const user3 = TestUser.singleSig(Rules.operationCount.lessOrEqual(1));

        const account = await sourceAccount(user1);

        await account.addAuthDescriptor(user2.authDescriptor);
        await account.addAuthDescriptor(user3.authDescriptor);

        await account.deleteAllAuthDescriptorsExclude(user1.authDescriptor);

        expect(account.authDescriptor.length).toEqual(1);

        await account.sync();

        expect(account.authDescriptor.length).toEqual(1)
    });

    it("should fail when deleting an auth descriptor which is not owned by the account", async () => {
        const user1 = TestUser.singleSig();
        const user2 = TestUser.singleSig();

        const account1 = await sourceAccount(user1);
        await sourceAccount(user2);

        const promise = account1.deleteAuthDescriptor(user2.authDescriptor);
        await expect(promise).rejects.toThrowError();
    });

    it("should delete auth descriptor", async () => {
        const user1 = TestUser.singleSig();
        const user2 = TestUser.singleSig();

        const account = await sourceAccount(user1);

        await account.addAuthDescriptor(user2.authDescriptor);
        await account.deleteAuthDescriptor(user2.authDescriptor);

        expect(account.authDescriptor.length).toEqual(1);
    });
    
    it("Should be able to create same rules with different value", async () => {
        let rules = Rules.blockHeight.greaterThan(1).and.blockHeight.greaterThan(10000).and.blockTime.greaterOrEqual(122222999);
           
        const user = TestUser.singleSig(rules);
        await expect(sourceAccount(user)).resolves.toBeDefined(); 
    });

    it("shouldn't be able to create too many rules", async () => {
        let rules = Rules.blockHeight.greaterThan(1).and.blockHeight.greaterThan(10000).and.blockTime.greaterOrEqual(122222999);
        for(let i=0; i<400; i++) {
            rules = rules.and.blockHeight.greaterOrEqual(i);
        }
        
        const user = TestUser.singleSig(rules);
        await expect(sourceAccount(user)).rejects.toThrowError();
    });
})