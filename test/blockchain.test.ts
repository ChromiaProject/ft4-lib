import testUser from "./util/test-user";
import AccountBuilder from "./util/account-builder";
import { version } from "../package.json";
import { ftUserSession } from "../client/lib/ft3/interfaces";
import { getNewAsset, getUserSession } from "./util/blockchain-util";
import { ChainInfo } from "../client/lib/ft3/utils/types";
import { ft } from "../client/lib/ft3";
import { getAuthDescriptorId } from "../client/lib/ft3/account/auth-descriptor";
import { ssoRawTransactionRegister } from "../client/lib/ft3/account/account-op-functions";

let ftSession: ftUserSession;

describe("Blockchain", () => {
  beforeAll(async () => {
    ftSession = await getUserSession();
  });
  it("should provide info", async () => {
    const info = await ftSession.get.chainInfo();

    expect(info).toEqual(<ChainInfo>{
      name: "test",
      website: "test_website",
      description: "test_description",
      rate_limit_active: true,
      rate_limit_max_points: 10,
      rate_limit_recovery_time: 5000,
      rate_limit_points_at_account_creation: 1,
    });
  });

  it("should provide ft3 rell-side version number", async () => {
    const info = await ftSession.get.version();

    expect(info).toEqual("4.0.0r");

    expect(ft.getClientVersion()).toEqual(version);
  });

  it("should be able to register an account", async () => {
    const user = testUser();
    const session = ftSession.changeUser(user);

    const account = await ftSession.account.dev.register(user.authDescriptor);
    const foundAccount = await session.get.account.by.id(account.id);

    expect(account).toEqual(foundAccount);
  });

  it("should return account by participant id", async () => {
    const user = testUser();

    const account = await AccountBuilder.account(ftSession)
      .withParticipants([user.signatureProvider])
      .build();

    const foundAccounts = await ftSession.get.account.by.participantId(
      user.signatureProvider.pubKey
    );

    expect(foundAccounts.length).toEqual(1);
    expect(await foundAccounts[0]).toEqual(account);
  });

  it("should return account by auth descriptor id", async () => {
    const user = testUser();

    const account = await AccountBuilder.account(ftSession)
      .withParticipants([user.signatureProvider])
      .build();

    const foundAccounts = await ftSession.get.account.by.authDescriptorId(
      getAuthDescriptorId(user.authDescriptor)
    );

    expect(foundAccounts.length).toEqual(1);
    expect(await foundAccounts[0]).toEqual(account);
  });

  it.skip("should be able to link other chain", async () => {
    //const brid = generateId();
    // await ftSession.linkChain(brid);
    // await expect(ftSession.isLinkedWithChain(brid)).resolves.toEqual(true);
  });

  it.skip("should be able to link multiple chains", async () => {
    //const brid1 = generateId();
    //const brid2 = generateId();
    // await ftSession.linkChain(brid1);
    // await ftSession.linkChain(brid2);
    // const linkedChains = await ftSession.getLinkedChainBRIDs();
    // expect(linkedChains).toContainEqual(brid1);
    // expect(linkedChains).toContainEqual(brid2);
  });

  it.skip("should return false when isLinkedWithChain is called for unknown chain id", async () => {
    // await expect(ftSession.isLinkedWithChain(generateId())).resolves.toEqual(
    //   false
    // );
  });

  it.skip("should successfully post raw transactions", async () => {
    const user = testUser();
    const vault = testUser();

    const session = ftSession.changeUser(user);

    const rawTransaction = await ssoRawTransactionRegister(
      vault.authDescriptor,
      user,
      session.get.gtxClient
    );

    await ftSession.get.gtxClient
      .transactionFromRawTransaction(rawTransaction)
      .postAndWaitConfirmation();

    const account = await session.get.account.by.id(
      getAuthDescriptorId(user.authDescriptor)
    );

    expect(account).not.toBeNull();
  });

  it("should return asset queried by id", async () => {
    const asset = await getNewAsset(ftSession);

    const queriedAsset = await ftSession.get.asset.by.id(asset.id);

    expect(queriedAsset).toEqual(asset);
  });

  it("should return all registered assets", async () => {
    const asset1 = await getNewAsset(ftSession);
    const asset2 = await getNewAsset(ftSession);
    const asset3 = await getNewAsset(ftSession);

    const expectedAssets = await ftSession.get.asset.all();

    expect(expectedAssets).toEqual(
      expect.arrayContaining([asset1, asset2, asset3])
    );
  });
});
