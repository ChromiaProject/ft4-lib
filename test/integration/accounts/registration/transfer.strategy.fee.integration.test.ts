import { AccountBuilder, getNewAsset, useChromiaNode } from "@ft4-test/util";
import { createSingleSigAuthDescriptorRegistration } from "@ft4/accounts";
import { Asset, createAmountFromBalance } from "@ft4/asset";
import { createInMemoryFtKeyStore } from "@ft4/authentication";
import { Connection, createConnection } from "@ft4/ft-session";
import {
  allowedAssets,
  feeAssets,
  pendingTransferStrategies,
  registerAccount,
  registrationStrategy,
} from "@ft4/registration";
import { encryption, gtv } from "postchain-client";

let connection: Connection;
let asset: Asset;

describe("Test transfer with fee", () => {
  const getClient = useChromiaNode();

  beforeAll(async () => {
    const client = getClient();
    connection = createConnection(client);
    asset = await getNewAsset(
      connection.client,
      "transfer_fee_strategy_asset",
      "TRANSFER_FEE_STRATEGY_ASSET",
      5,
    );
  });

  it("can register account which receives transferred assets, minus fee", async () => {
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

    const _feeAssets = await connection.query(feeAssets());
    const rawFee = _feeAssets.find((v) => v.asset_id.equals(asset.id))?.amount;
    expect(rawFee).toBeTruthy();

    await account1.transfer(recipientId, asset.id, amount);

    const strategies = await connection.query(
      pendingTransferStrategies(recipientId),
    );
    expect(strategies).toContain("fee");

    const keyStore = createInMemoryFtKeyStore(keyPair);

    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      ["A", "T"],
      keyStore.id,
    );

    const { session } = await registerAccount(
      connection.client,
      keyStore,
      registrationStrategy.transferFee(asset, authDescriptor),
    );

    expect(session.account.id).toEqual(recipientId);

    const assetBalance1 = await session.account.getBalanceByAssetId(asset.id);
    expect(assetBalance1!.amount.value).toBe(amount.value - rawFee!);

    expect(
      await connection.query(pendingTransferStrategies(recipientId)),
    ).toStrictEqual([]);
  });

  it("can complete pending transfers when account is registered with direct strategies", async () => {
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

    await account1.transfer(recipientId, asset.id, amount);

    expect(
      (await connection.query(pendingTransferStrategies(recipientId))).length,
    ).toBeGreaterThan(0);

    const keyStore = createInMemoryFtKeyStore(keyPair);

    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      ["A", "T"],
      keyStore.id,
    );

    const { session } = await registerAccount(
      connection.client,
      keyStore,
      registrationStrategy.open(authDescriptor),
    );

    expect(session.account.id).toEqual(recipientId);

    const assetBalance1 = await session.account.getBalanceByAssetId(asset.id);
    expect(assetBalance1?.amount?.value).toBe(amount.value);

    expect(
      (await connection.query(pendingTransferStrategies(recipientId))).length,
    ).toEqual(0);
  });
});
