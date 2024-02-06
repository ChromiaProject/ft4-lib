import { registerAccount } from "@ft4/accounts/registration";
import { transfer } from "@ft4/accounts/registration/strategies/transfer";
import { TRANSFER_STRATEGY_OPEN } from "@ft4/accounts/registration/strategies/transfer";
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
import { TxRejectedError } from "postchain-client";
import { gtv } from "postchain-client";
import { getNewAsset } from "@ft4/util/blockchain-util";
import AccountBuilder from "@ft4/util/account-builder";

let connection: Connection;
let asset: Asset;

describe("Test transfer strategy", () => {
  const getClient = useChromiaNode();

  beforeAll(async () => {
    const client = getClient();
    connection = createConnection(client);
    asset = await getNewAsset(connection.client, undefined, undefined, 5);
  });

  it("can register account which receives transferred assets", async () => {
    const keyPair = encryption.makeKeyPair();
    const recipientId = gtv.gtvHash(keyPair.pubKey);

    const account1 = await AccountBuilder.account(connection)
      .withBalance(asset, 200)
      .withPoints(1)
      .build();

    await account1.transfer(
      recipientId,
      asset.id,
      createAmount(10, asset.decimals),
    );

    const keyStore = createInMemoryFtKeyStore(keyPair);

    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      ["A", "T"],
      keyStore.id,
    );

    const session = await registerAccount(
      connection,
      keyStore,
      transfer(TRANSFER_STRATEGY_OPEN, authDescriptor),
    );

    expect(session.account.id).toEqual(recipientId);

    const assetBalance1 = await session.account.getBalanceByAssetId(asset.id);
    expect(assetBalance1!.amount.eq(createAmount(10, asset.decimals))).toBe(
      true,
    );
  });

  it("can not register account without pending transfer", async () => {
    const keyPair = encryption.makeKeyPair();
    const keyStore = createInMemoryFtKeyStore(keyPair);

    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      ["A", "T"],
      keyStore.id,
    );

    await expect(
      registerAccount(
        connection,
        keyStore,
        transfer(TRANSFER_STRATEGY_OPEN, authDescriptor),
      ),
    ).rejects.toThrow(TxRejectedError);
  });
});
