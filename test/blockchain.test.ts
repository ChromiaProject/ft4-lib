import TestConnection from "./util/test-connection";
import BlockchainInfo from "../client/lib/ft3/blockchain-info";
import Blockchain from "../client/lib/ft3/blockchain";
import TestUser from "./util/test-user";
import AccountBuilder from "./util/account-builder";
import {generateId} from "./util/util";
import BlockchainUtil from "./util/blockchain-util";
import ConnectionClient from "../client/lib/ft3/connection-client";
import {Account} from "../client/lib/ft3";
import RateLimit from "../client/lib/ft3/rate-limit";

let blockchain: Blockchain = null;
const connection: ConnectionClient = TestConnection.connection();

describe("Blockchain", () => {
    beforeAll(async () => {
        blockchain = await BlockchainUtil.getDefaultBlockchain()
    });

    it("should provide info", async () => {
        const info = await BlockchainInfo.getInfo(connection);

        expect(info).toEqual(new BlockchainInfo('test', 'test_website', 'test_description', 10, 5000));
    });

    it('should be able to register an account', async () => {
        const user = TestUser.singleSig();
        const session = blockchain.newSession(user);

        const account = await blockchain.registerAccount(user.authDescriptor, user);
        const foundAccount = await session.getAccountById(account.id_);

        expect(account).toEqual(foundAccount);
    });

    it('should return account by participant id', async () => {
        const user = TestUser.singleSig();

        const account = await AccountBuilder
            .account(blockchain, user)
            .withParticipants([user.keyPair])
            .build();

        const foundAccounts = await blockchain.getAccountsByParticipantId(user.keyPair.pubKey, user);

        expect(foundAccounts.length).toEqual(1);
        expect(foundAccounts[0]).toEqual(account);
    });

    it('should return account by auth descriptor id', async () => {
        const user = TestUser.singleSig();

        const account = await AccountBuilder
            .account(blockchain, user)
            .withParticipants([user.keyPair])
            .build();

        const foundAccounts = await blockchain.getAccountsByAuthDescriptorId(
            user.authDescriptor.hash(),
            user
        );

        expect(foundAccounts.length).toEqual(1);
        expect(foundAccounts[0]).toEqual(account);
    });

    it('should be able to link other chain', async () => {
        const chainId = generateId();

        await blockchain.linkChain(chainId);

        await expect(blockchain.isLinkedWithChain(chainId)).resolves.toEqual(true);
    });

    it('should be able to link multiple chains', async () => {
        const chainId1 = generateId();
        const chainId2 = generateId();

        await blockchain.linkChain(chainId1);
        await blockchain.linkChain(chainId2);

        const linkedChains = await blockchain.getLinkedChainsIds();

        expect(linkedChains).toContainEqual(chainId1);
        expect(linkedChains).toContainEqual(chainId2);
    });

    it('should return false when isLinkedWithChain is called for unknown chain id', async () => {
        await expect(blockchain.isLinkedWithChain(generateId())).resolves.toEqual(false);
    });

    it.skip('should successfully post raw transactions', async () => {
        const user = TestUser.singleSig();
        const vault = TestUser.singleSig();

        const session = blockchain.newSession(user);

        const rawTransaction = Account.rawRegisterTransaction(
            user.authDescriptor,
            vault.authDescriptor,
            session
        );

        await blockchain.postRaw(rawTransaction);

        const account = await session.getAccountById(user.authDescriptor.id);

        expect(account).not.toBeNull()
    });
});