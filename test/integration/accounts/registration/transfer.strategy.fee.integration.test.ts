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
  AccountCreationTransferFilter,
} from "@ft4/accounts";
import { Amount, Asset, createAmountFromBalance } from "@ft4/asset";
import { FtKeyStore, createInMemoryFtKeyStore } from "@ft4/authentication";
import { Connection, createConnection } from "@ft4/ft-session";
import {
  allowedAssets,
  feeAssets,
  pendingTransferStrategies,
  registerAccount,
  registrationStrategy,
} from "@ft4/registration";
import { encryption, gtv } from "postchain-client";
import { MERKLE_HASH_VERSIONS } from "@ft4/utils/main";

let connection: Connection;
let asset: Asset;

describe("Test transfer with fee", () => {
  const getClient = useChromiaNode();

  beforeAll(async () => {
    const client = getClient();
    connection = createConnection(client);
    asset = await addNewAssetIfNeeded(
      connection.client,
      "transfer_fee_strategy_asset",
      "TRANSFER_FEE_STRATEGY_ASSET",
      5,
    );
  });

  let recipientId: Buffer;
  let account1: AuthenticatedAccount;
  let amount: Amount;
  let keyStore: FtKeyStore;
  let authDescriptor: AnyAuthDescriptorRegistration;

  beforeEach(async () => {
    // Create a recipient
    const keyPair = encryption.makeKeyPair();
    recipientId = gtv.gtvHash(keyPair.pubKey, MERKLE_HASH_VERSIONS.ONE);
    keyStore = createInMemoryFtKeyStore(keyPair);
    authDescriptor = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Account, AuthFlag.Transfer],
      keyStore.id,
    );

    // Create an account to send from
    account1 = await AccountBuilder.account(connection)
      .withBalance(asset, 200)
      .withPoints(1)
      .build();

    // Download a list of allowed assets
    const _allowedAssets = (await connection.query(
      allowedAssets(connection.blockchainRid, account1.id, recipientId),
    ))!;

    // Get the amount to transfer
    const rawAmount = _allowedAssets.find((v) =>
      v.asset_id.equals(asset.id),
    )!.min_amount;
    amount = createAmountFromBalance(rawAmount!, asset.decimals);
  });

  it("can register account which receives transferred assets, minus fee", async () => {
    // Perform the transfer that will create the recipients account
    await account1.transfer(recipientId, asset.id, amount);

    const strategies = await connection.query(
      pendingTransferStrategies(recipientId),
    );
    expect(strategies).toContain("fee");

    const { session } = await registerAccount(
      connection.client,
      keyStore,
      registrationStrategy.transferFee(asset, authDescriptor),
    );

    expect(session.account.id).toEqual(recipientId);

    const _feeAssets = await connection.query(feeAssets());
    const rawFee = _feeAssets.find((v) => v.asset_id.equals(asset.id))?.amount;
    expect(rawFee).toBeTruthy();

    const assetBalance1 = await session.account.getBalanceByAssetId(asset.id);
    expect(assetBalance1!.amount.value).toBe(amount.value - rawFee!);

    expect(
      await connection.query(pendingTransferStrategies(recipientId)),
    ).toStrictEqual([]);
  });

  it("can complete pending transfers when account is registered with direct strategies", async () => {
    // Perform the transfer that will create the recipients account
    await account1.transfer(recipientId, asset.id, amount);

    expect(
      (await connection.query(pendingTransferStrategies(recipientId))).length,
    ).toBeGreaterThan(0);

    const { session } = await registerAccount(
      connection.client,
      keyStore,
      registrationStrategy.open(authDescriptor),
    );

    expect(session.account.id).toEqual(recipientId);

    const assetBalance1 = await session.account.getBalanceByAssetId(asset.id);
    expect(assetBalance1?.amount?.value).toBe(amount.value);

    expect(
      await connection.query(pendingTransferStrategies(recipientId)),
    ).toStrictEqual([]);
  });

  it("returns filtered account creation transfers", async () => {
    await account1.transfer(recipientId, asset.id, amount);
    const accountCreationTransferFilter: AccountCreationTransferFilter = {
      rowids: null,
      transaction_tx_rid: null,
      op_index: null,
      recipient_id: null,
    };

    const filteredAccountCreationTransfers =
      await connection.getAccountCreationTransfersFiltered(
        accountCreationTransferFilter,
      );
    expect(filteredAccountCreationTransfers.data.length).toBeGreaterThan(0);
  });
});
