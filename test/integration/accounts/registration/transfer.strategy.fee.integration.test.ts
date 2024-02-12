import { registerAccount } from "@ft4/accounts/registration";
import {
  Connection,
  createConnection,
  createInMemoryFtKeyStore,
  createSingleSigAuthDescriptorRegistration,
} from "@ft4/index";
import { Asset } from "@ft4/index";
import { createAmount } from "@ft4/index";
import { useChromiaNode } from "@ft4/util/chromia-node";
import { encryption } from "postchain-client";
import { gtv } from "postchain-client";
import { getNewAsset } from "@ft4/util/blockchain-util";
import AccountBuilder from "@ft4/util/account-builder";
import { pendingTransferStrategies } from "@ft4/accounts/registration/strategies/transfer/queries";
import { transfer_fee } from "@ft4/accounts/registration/strategies/transfer/fee/index";
import { feeAssets } from "@ft4/accounts/registration/strategies/transfer/fee/queries";

let connection: Connection;
let asset: Asset;

describe("Test transfer with fee", () => {
  const getClient = useChromiaNode();

  beforeAll(async () => {
    const client = getClient();
    connection = createConnection(client);
    asset = await getNewAsset(connection.client, undefined, undefined, 5);
  });

  it.skip("can register account which receives transferred assets, minus fee", async () => {
    const keyPair = encryption.makeKeyPair();
    const recipientId = gtv.gtvHash(keyPair.pubKey);

    const account1 = await AccountBuilder.account(connection)
      .withBalance(asset, 200)
      .withPoints(1)
      .build();

    // const _allowedAssets = await connection.query(allowedAssets());
    // TODO use allowedAssets

    const _feeAssets = await connection.query(feeAssets());
    // TODO use feeAssets

    const amount = createAmount(10, asset.decimals);

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

    const session = await registerAccount(
      connection,
      keyStore,
      transfer_fee(asset, authDescriptor),
    );

    expect(session.account.id).toEqual(recipientId);

    const assetBalance1 = await session.account.getBalanceByAssetId(asset.id);
    expect(assetBalance1!.amount.value).toBe(
      amount.value - _feeAssets[0].amount,
    );

    expect(
      await connection.query(pendingTransferStrategies(recipientId)),
    ).toBeNull();
  });
});
