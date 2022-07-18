import BlockchainInfo from "../client/lib/ft3/core/blockchain/blockchain-info";
import Blockchain from "../client/lib/ft3/core/blockchain/blockchain";
import TestUser from "./util/test-user";
import AccountBuilder from "./util/account-builder";
import { generateAssetName, generateId } from "./util/util";
import BlockchainUtil from "./util/blockchain-util";
import { Asset, RateLimitInfo } from "../client/lib/ft3";
import MutableAccount from "../client/lib/ft3/user/mutable-account";
import ConnectionClient from "../client/lib/ft3/core/connection-client";
import ChainConnectionInfo from "../client/lib/ft3/core/chain-connection-info";
import DirectoryServiceBase from "../client/lib/ft3/core/blockchain/directory-service-base";

let blockchain: Blockchain = null;

describe("Blockchain", () => {
  beforeAll(async () => {
    blockchain = await BlockchainUtil.getDefaultBlockchain();
  });

  it("should provide info", async () => {
    const info = await BlockchainInfo.getInfo(blockchain.connection);

    expect(info).toEqual(
      new BlockchainInfo(
        "test",
        "test_website",
        "test_description",
        new RateLimitInfo(true, 10, 5000, 1)
      )
    );
  });

  it("shouldn't create a blockchain with non-matching ID and ConnectionClient", async () => {
    const rateLimit = new RateLimitInfo(false, 0, 0, 1);

    const f = () =>
      new Blockchain(
        generateId(),
        new BlockchainInfo("name", "website", "description", rateLimit),
        new ConnectionClient("URL", generateId().toString("hex")),
        new DirectoryServiceBase([new ChainConnectionInfo(generateId(), "URL")])
      );

    expect(f).toThrowError();
  });

  it("should be able to register an account", async () => {
    const user = TestUser.singleSig();
    const session = blockchain.newSession(user);

    const account = await blockchain.registerAccount(user.authDescriptor, user);
    const foundAccount = await session.getAccountById(account.id);

    expect(account).toEqual(foundAccount);
  });

  it("should return account by participant id", async () => {
    const user = TestUser.singleSig();

    const account = await AccountBuilder.account(blockchain, user)
      .withParticipants([user.signatureProvider])
      .build();

    const foundAccounts = await blockchain.getAccountsByParticipantId(
      user.signatureProvider.pubKey
    );

    expect(foundAccounts.length).toEqual(1);
    expect(await foundAccounts[0].mutable(user)).toEqual(account);
  });

  it("should return account by auth descriptor id", async () => {
    const user = TestUser.singleSig();

    const account = await AccountBuilder.account(blockchain, user)
      .withParticipants([user.signatureProvider])
      .build();

    const foundAccounts = await blockchain.getAccountsByAuthDescriptorId(
      user.authDescriptor.hash()
    );

    expect(foundAccounts.length).toEqual(1);
    expect(await foundAccounts[0].mutable(user)).toEqual(account);
  });

  it.skip("should be able to link other chain", async () => {
    const chainId = generateId();

    await blockchain.linkChain(chainId);

    await expect(blockchain.isLinkedWithChain(chainId)).resolves.toEqual(true);
  });

  it.skip("should be able to link multiple chains", async () => {
    const chainId1 = generateId();
    const chainId2 = generateId();

    await blockchain.linkChain(chainId1);
    await blockchain.linkChain(chainId2);

    const linkedChains = await blockchain.getLinkedChainsIds();

    expect(linkedChains).toContainEqual(chainId1);
    expect(linkedChains).toContainEqual(chainId2);
  });

  it.skip("should return false when isLinkedWithChain is called for unknown chain id", async () => {
    await expect(blockchain.isLinkedWithChain(generateId())).resolves.toEqual(
      false
    );
  });

  it.skip("should successfully post raw transactions", async () => {
    const user = TestUser.singleSig();
    const vault = TestUser.singleSig();

    const session = blockchain.newSession(user);

    const rawTransaction = await MutableAccount.rawTransactionRegister(
      user,
      vault.authDescriptor,
      blockchain
    );

    await blockchain.postRaw(rawTransaction);

    const account = await session.getAccountById(user.authDescriptor.id);

    expect(account).not.toBeNull();
  });

  it("should return asset queried by id", async () => {
    const asset = await Asset.register(
      generateAssetName(),
      generateId(),
      blockchain
    );

    const queriedAsset = await blockchain.getAssetById(asset.id);

    expect(queriedAsset).toEqual(asset);
  });

  it("should return all registered assets", async () => {
    const asset1 = await Asset.register(
      generateAssetName(),
      generateId(),
      blockchain
    );
    const asset2 = await Asset.register(
      generateAssetName(),
      generateId(),
      blockchain
    );
    const asset3 = await Asset.register(
      generateAssetName(),
      generateId(),
      blockchain
    );

    const expectedAssets = await blockchain.getAllAssets();

    expect(expectedAssets).toEqual(
      expect.arrayContaining([asset1, asset2, asset3])
    );
  });
});
