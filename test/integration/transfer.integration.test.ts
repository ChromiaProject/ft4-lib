import {
  AccountBuilder,
  singleSigUser as TestUser,
  User,
  adminUser,
  createTestAuthDescriptor,
  getNewAsset,
  useChromiaNode,
} from "@ft4-test/util";
import { getExpectedAccountIdFromMainAuthDescriptor } from "@ft4/utils";
import {
  AuthFlag,
  createAuthenticatedAccount,
  createMultiSigAuthDescriptorRegistration,
} from "@ft4/accounts";
import { registerAccountAdmin } from "@ft4/admin";
import { Asset, createAmount } from "@ft4/asset";
import {
  createAuthenticator,
  createInMemoryFtKeyStore,
} from "@ft4/authentication";
import {
  Connection,
  createConnection,
  createKeyStoreInteractor,
} from "@ft4/ft-session";
import { IClient, newSignatureProvider } from "postchain-client";

let asset: Asset;
let connection: Connection;
let client: IClient;
let admin: User;

describe("Transfer", () => {
  const getClient = useChromiaNode();

  beforeAll(async () => {
    client = getClient();
    connection = createConnection(client);
    asset = await getNewAsset(connection.client, "transfer", "TRANSFER", 5);
    admin = adminUser();
  });

  it("should succeed when balance is higher than amount to transfer", async () => {
    const account1 = await AccountBuilder.account(connection)
      .withBalance(asset, 200)
      .withPoints(1)
      .build();

    const account2 = await AccountBuilder.account(connection).build();

    await account1.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals),
    );

    const assetBalance1 = await account1.getBalanceByAssetId(asset.id);
    const assetBalance2 = await account2.getBalanceByAssetId(asset.id);

    expect(assetBalance1!.amount.eq(createAmount(190, asset.decimals))).toBe(
      true,
    );
    expect(assetBalance2!.amount.eq(createAmount(10, asset.decimals))).toBe(
      true,
    );
  });

  it("fails when balance is lower than amount to transfer", async () => {
    const account1 = await AccountBuilder.account(connection)
      .withBalance(asset, 5)
      .withPoints(1)
      .build();

    const account2 = await AccountBuilder.account(connection).build();

    const promise = account1.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals),
    );

    await expect(promise).rejects.toBeInstanceOf(Error);
  });

  it("should fail if auth descriptor doesn't have transfer rights", async () => {
    const account1 = await AccountBuilder.account(connection)
      .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
      .withBalance(asset, 200)
      .withPoints(1)
      .build();

    // Add auth descriptor without T flag
    const { authDescriptor, keyStore } = createTestAuthDescriptor([]);
    await account1.addAuthDescriptor(authDescriptor, keyStore);
    const authenticator = createAuthenticator(
      account1.id,
      [keyStore.createKeyHandler(authDescriptor)],
      account1.authenticator.authDataService,
    );
    // Initialize account object to use only auth descriptor without T flag
    const accountSessionWithoutTFlag = createAuthenticatedAccount(
      connection,
      authenticator,
    );

    const account2 = await AccountBuilder.account(connection).build();

    const promise = accountSessionWithoutTFlag.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals),
    );
    await expect(promise).rejects.toThrow(
      "No key handler registered to handle operation <ft4.transfer>",
    );
  });

  it("should succeed if transferring tokens to a multisig account", async () => {
    const user2 = TestUser(client);
    const user3 = TestUser(client);

    const account1 = await AccountBuilder.account(connection)
      .withBalance(asset, 200)
      .withPoints(1)
      .build();

    const authDescriptor = createMultiSigAuthDescriptorRegistration(
      [AuthFlag.Account, AuthFlag.Transfer],
      [user2.signatureProvider.pubKey, user3.signatureProvider.pubKey],
      2,
      null,
    );
    await registerAccountAdmin(
      connection.client,
      admin.signatureProvider,
      authDescriptor,
    );

    const account2 = await createConnection(connection.client).getAccountById(
      getExpectedAccountIdFromMainAuthDescriptor(authDescriptor, client),
    );

    await account1.transfer(
      account2!.id,
      asset.id,
      createAmount(10, asset.decimals),
    );

    const assetBalance1 = await account1.getBalanceByAssetId(asset.id);
    const assetBalance2 = await account2!.getBalanceByAssetId(asset.id);

    expect(assetBalance1!.amount.eq(createAmount(190, asset.decimals))).toBe(
      true,
    );
    expect(assetBalance2!.amount.eq(createAmount(10, asset.decimals))).toBe(
      true,
    );
  });

  it("should succeed burning tokens", async () => {
    const keyPair = newSignatureProvider();

    const account = await AccountBuilder.account(connection)
      .withSigner(keyPair)
      .withBalance(asset, 200)
      .withPoints(1)
      .build();

    const session = await createKeyStoreInteractor(
      client,
      createInMemoryFtKeyStore(keyPair),
    ).getSession(account.id);
    await session.account.burn(asset.id, createAmount(10, asset.decimals));
    const assetBalance = await session.account.getBalanceByAssetId(asset.id);

    expect(
      assetBalance!.amount.eq(createAmount(190, asset.decimals)),
    ).toBeTruthy();
  });
});
