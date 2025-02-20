import {
  AccountBuilder,
  addNewAssetIfNeeded,
  useChromiaNode,
} from "@ft4-test/util";
import {
  AnyAuthDescriptorRegistration,
  AuthenticatedAccount,
  AuthFlag,
  createSingleSigAuthDescriptorRegistration,
  SubscriptionFilter,
} from "@ft4/accounts";
import { Asset, createAmountFromBalance } from "@ft4/asset";
import { FtKeyStore, createInMemoryFtKeyStore } from "@ft4/authentication";
import { Connection, createConnection } from "@ft4/ft-session";
import {
  allowedAssets,
  pendingTransferStrategies,
  registerAccount,
  renewSubscription,
  subscriptionAssets,
  subscriptionDetails,
  subscriptionPeriodMillis,
  transferSubscription,
} from "@ft4/registration";
import { QueryObject, encryption, gtv } from "postchain-client";

let connection: Connection;
let asset: Asset;

describe("Test transfer with subscription", () => {
  const getClient = useChromiaNode();

  beforeAll(async () => {
    const client = getClient();
    connection = createConnection(client);
    asset = await addNewAssetIfNeeded(
      connection.client,
      "transfer_subscription_strategy_asset",
      "TRANSFER_SUBSCRIPTION_STRATEGY_ASSET",
      5,
    );
  });

  let recipientId: Buffer;
  let senderAccount: AuthenticatedAccount;
  let ftKeyStore: FtKeyStore;
  let authDescriptorToRegister: AnyAuthDescriptorRegistration;
  beforeEach(async () => {
    const keyPair = encryption.makeKeyPair();
    recipientId = gtv.gtvHash(keyPair.pubKey);
    senderAccount = await AccountBuilder.account(connection)
      .withBalance(asset, 200)
      .withPoints(1)
      .build();
    ftKeyStore = createInMemoryFtKeyStore(keyPair);
    authDescriptorToRegister = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Account, AuthFlag.Transfer],
      ftKeyStore.id,
    );
  });

  async function getDynamicAmount(asset: Asset, query: QueryObject<any, any>) {
    const _allowedAssets = (await connection.query(query))!;

    const _asset = _allowedAssets.find((v) => v.asset_id.equals(asset.id));

    return createAmountFromBalance(
      _asset.min_amount || _asset.amount,
      asset.decimals,
    );
  }

  it("can register account with subscription strategy", async () => {
    const amount = await getDynamicAmount(
      asset,
      allowedAssets(connection.blockchainRid, senderAccount.id, recipientId),
    );
    await senderAccount.transfer(recipientId, asset.id, amount);

    const { session } = await registerAccount(
      connection.client,
      ftKeyStore,
      transferSubscription(asset, authDescriptorToRegister),
    );

    expect(session.account.id).toEqual(recipientId);
  });

  it("returns filtered subscriptions", async () => {
    const amount = await getDynamicAmount(
      asset,
      allowedAssets(connection.blockchainRid, senderAccount.id, recipientId),
    );
    await senderAccount.transfer(recipientId, asset.id, amount);

    await registerAccount(
      connection.client,
      ftKeyStore,
      transferSubscription(asset, authDescriptorToRegister),
    );

    const subscriptionFilter: SubscriptionFilter = {
      account_ids: [recipientId],
    };

    const filteredSubscriptions =
      await connection.getSubscriptionsFiltered(subscriptionFilter);
    expect(filteredSubscriptions.data[0].subscriptionAccountId).toStrictEqual(
      recipientId,
    );
  });

  it("receives transferred assets, minus subscription fee when account is created", async () => {
    const amount = await getDynamicAmount(
      asset,
      allowedAssets(connection.blockchainRid, senderAccount.id, recipientId),
    );
    const subscriptionAmount = await getDynamicAmount(
      asset,
      subscriptionAssets(),
    );

    await senderAccount.transfer(recipientId, asset.id, amount);

    const { session } = await registerAccount(
      connection.client,
      ftKeyStore,
      transferSubscription(asset, authDescriptorToRegister),
    );

    const assetBalance1 = await session.account.getBalanceByAssetId(asset.id);
    expect(assetBalance1!.amount.value).toBe(
      amount.value - subscriptionAmount.value!,
    );

    expect(
      await connection.query(pendingTransferStrategies(recipientId)),
    ).toStrictEqual([]);
  });

  it("deduces subscription amount from account when subscription is renewed", async () => {
    const amount = await getDynamicAmount(
      asset,
      allowedAssets(connection.blockchainRid, senderAccount.id, recipientId),
    );
    const subscriptionAmount = await getDynamicAmount(
      asset,
      subscriptionAssets(),
    );

    await senderAccount.transfer(recipientId, asset.id, amount);

    const { session } = await registerAccount(
      connection.client,
      ftKeyStore,
      transferSubscription(asset, authDescriptorToRegister),
    );

    await session.call(renewSubscription(null));

    const assetBalance2 = await session.account.getBalanceByAssetId(asset.id);
    expect(assetBalance2!.amount.value).toBe(
      amount.value - 2n * subscriptionAmount.value!,
    );
  });

  it("increases accumulated subscription amount when subscription is renewed", async () => {
    const amount = await getDynamicAmount(
      asset,
      allowedAssets(connection.blockchainRid, senderAccount.id, recipientId),
    );

    await senderAccount.transfer(recipientId, asset.id, amount);

    const { session } = await registerAccount(
      connection.client,
      ftKeyStore,
      transferSubscription(asset, authDescriptorToRegister),
    );

    const { last_payment: lastPayment1 } = await connection.query(
      subscriptionDetails(recipientId),
    );
    expect(lastPayment1).toBeGreaterThan(0);

    expect(await connection.query(subscriptionPeriodMillis())).toBeGreaterThan(
      0,
    );

    await session.call(renewSubscription(null));

    const { last_payment: lastPayment2 } = await connection.query(
      subscriptionDetails(recipientId),
    );
    expect(lastPayment2).toBeGreaterThan(lastPayment1);
  });
});
