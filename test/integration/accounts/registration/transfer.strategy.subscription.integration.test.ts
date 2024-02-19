import { registerAccount } from "@ft4/accounts/registration";
import {
  Connection,
  createConnection,
  createInMemoryFtKeyStore,
  createSingleSigAuthDescriptorRegistration,
} from "@ft4/index";
import { Asset } from "@ft4/index";
import { useChromiaNode } from "@ft4/util/chromia-node";
import { encryption } from "postchain-client";
import { gtv } from "postchain-client";
import { getNewAsset } from "@ft4/util/blockchain-util";
import AccountBuilder from "@ft4/util/account-builder";
import { pendingTransferStrategies } from "@ft4/accounts/registration/strategies/transfer/queries";
import { transferSubscription } from "@ft4/accounts/registration/strategies/transfer/subscription/index";
import { subscriptionAssets } from "@ft4/accounts/registration/strategies/transfer/subscription/queries";
import { allowedAssets } from "@ft4/accounts/registration/strategies/transfer/queries";
import { createAmountFromBalance } from "@ft4/index";
import { subscriptionLastPayment } from "@ft4/accounts/registration/strategies/transfer/subscription/index";

let connection: Connection;
let asset: Asset;

describe("Test transfer with subscription", () => {
  const getClient = useChromiaNode();

  beforeAll(async () => {
    const client = getClient();
    connection = createConnection(client);
    asset = await getNewAsset(
      connection.client,
      "transfer_subscription_strategy_asset",
      "TRANSFER_SUBSCRIPTION_STRATEGY_ASSET",
      5,
    );
  });

  it("can register account which receives transferred assets, minus subscription fee", async () => {
    const keyPair = encryption.makeKeyPair();
    const recipientId = gtv.gtvHash(keyPair.pubKey);

    const account1 = await AccountBuilder.account(connection)
      .withBalance(asset, 200)
      .withPoints(1)
      .build();

    const _allowedAssets = (await connection.query(
      allowedAssets(connection.blockchainRid, account1.id, recipientId),
    ))!;
    expect(_allowedAssets).toBeTruthy();
    const rawAmount = _allowedAssets.find((v) =>
      v.asset_id.equals(asset.id),
    )?.min_amount;
    expect(rawAmount).toBeTruthy();
    const amount = createAmountFromBalance(rawAmount!, asset.decimals);

    const _subscriptionAssets = await connection.query(subscriptionAssets());
    const rawSubscription = _subscriptionAssets.find((v) =>
      v.asset_id.equals(asset.id),
    )?.amount;
    expect(rawSubscription).toBeTruthy();

    await account1.transfer(recipientId, asset.id, amount);

    const strategies = await connection.query(
      pendingTransferStrategies(recipientId),
    );
    expect(strategies).toContain("subscription");

    const keyStore = createInMemoryFtKeyStore(keyPair);

    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      ["A", "T"],
      keyStore.id,
    );

    const session = await registerAccount(
      connection,
      keyStore,
      transferSubscription(asset, authDescriptor),
    );

    expect(session.account.id).toEqual(recipientId);

    const assetBalance1 = await session.account.getBalanceByAssetId(asset.id);
    expect(assetBalance1!.amount.value).toBe(amount.value - rawSubscription!);

    expect(
      await connection.query(pendingTransferStrategies(recipientId)),
    ).toStrictEqual([]);

    expect(
      await connection.query(subscriptionLastPayment(recipientId)),
    ).toBeGreaterThan(0);
  });
});
