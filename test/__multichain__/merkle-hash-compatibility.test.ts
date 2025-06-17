import {
  AccountBuilder,
  adminUser,
  Blockchain,
  createChromiaClientToMultichain,
  fetchBlockchains,
  getNewAsset,
  NODE_URL,
} from "@ft4-test/util";
import { Connection, createConnection } from "@ft4/ft-session";
import { registerCrosschainAsset } from "@ft4/admin";
import { createAmount } from "@ft4/asset";
import { AuthFlag } from "@ft4/accounts";
import { transactionBuilder } from "@ft4/transaction-builder";
import {
  createInMemoryFtKeyStore,
  noopAuthenticator,
} from "@ft4/authentication";
import {
  initAndApplyCrosschainTransfer,
  initAndCancelCrosschainTransfer,
  initApplyCancelUnapplyCrosschainTransfer,
} from "./crosschain-helpers";
import { encryption, gtv, MERKLE_HASH_VERSIONS } from "postchain-client";

let multichain00: Blockchain;
let multichain01: Blockchain;
let multichain03: Blockchain;
let multichain04: Blockchain;

describe("crosschain transfer compatibility", () => {
  beforeAll(async () => {
    const blockchains = await fetchBlockchains(false, MERKLE_HASH_VERSIONS.ONE);
    multichain00 = blockchains.multichain00;
    multichain01 = blockchains.multichain01;
    multichain03 = blockchains.multichain03;
    multichain04 = blockchains.multichain04;
  });

  describe("multichain00 uses merkleHashVersion 1, multichain03 uses merklehashVersion 2 and multichain01 uses merkleHashVersion 1", () => {
    let connection00: Connection;
    let connection03: Connection;
    let connection01: Connection;
    beforeAll(async () => {
      connection00 = createConnection(
        await createChromiaClientToMultichain(
          multichain00.rid,
          NODE_URL,
          MERKLE_HASH_VERSIONS.ONE,
        ),
      );

      connection03 = createConnection(
        await createChromiaClientToMultichain(
          multichain03.rid,
          NODE_URL,
          MERKLE_HASH_VERSIONS.TWO,
        ),
      );

      connection01 = createConnection(
        await createChromiaClientToMultichain(
          multichain01.rid,
          NODE_URL,
          MERKLE_HASH_VERSIONS.ONE,
        ),
      );
    });

    describe("accounts are registered before transfer", () => {
      it("inits and applies transfer", async () => {
        const asset = await getNewAsset(
          connection00.client,
          "crosschain-transfer-test-asset-compatibility01",
          "CROSSCHAIN-transfer-test-asset-compatibility01",
        );

        await registerCrosschainAsset(
          connection03.client,
          adminUser(connection03.client.config.merkleHashVersion)
            .signatureProvider,
          asset.id,
          multichain00.rid,
        );

        const account00 = await AccountBuilder.account(
          connection00,
          MERKLE_HASH_VERSIONS.ONE,
        )
          .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
          .withBalance(asset, createAmount(100, asset.decimals))
          .build();

        const account03 = await AccountBuilder.account(
          connection03,
          MERKLE_HASH_VERSIONS.TWO,
        )
          .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
          .build();

        const sourceTb = transactionBuilder(
          account00.authenticator,
          connection00.client,
        );

        const destinationTb = transactionBuilder(
          noopAuthenticator,
          connection03.client,
        );

        await initAndApplyCrosschainTransfer(
          account03.id,
          asset,
          [multichain03.rid],
          sourceTb,
          destinationTb,
        );
      });

      it("inits and cancels expired transfer", async () => {
        const asset = await getNewAsset(
          connection00.client,
          "crosschain-transfer-test-asset-compatibility02",
          "CROSSCHAIN-transfer-test-asset-compatibility02",
        );

        await registerCrosschainAsset(
          connection03.client,
          adminUser(connection03.client.config.merkleHashVersion)
            .signatureProvider,
          asset.id,
          multichain00.rid,
        );

        const account00 = await AccountBuilder.account(
          connection00,
          MERKLE_HASH_VERSIONS.ONE,
        )
          .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
          .withBalance(asset, createAmount(100, asset.decimals))
          .build();

        const account03 = await AccountBuilder.account(
          connection03,
          MERKLE_HASH_VERSIONS.TWO,
        )
          .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
          .build();

        const sourceTb = transactionBuilder(
          account00.authenticator,
          connection00.client,
        );

        const destinationTb = transactionBuilder(
          noopAuthenticator,
          connection03.client,
        );

        await initAndCancelCrosschainTransfer(
          account03.id,
          asset,
          [multichain03.rid],
          Date.now(),
          sourceTb,
          destinationTb,
          connection03,
        );
      });

      it("inits applies cancels and unapplies a transfer", async () => {
        const asset = await getNewAsset(
          connection00.client,
          "crosschain-transfer-test-asset-compatibility03",
          "CROSSCHAIN-transfer-test-asset-compatibility03",
        );

        await registerCrosschainAsset(
          connection03.client,
          adminUser(connection03.client.config.merkleHashVersion)
            .signatureProvider,
          asset.id,
          multichain00.rid,
        );

        const account00 = await AccountBuilder.account(
          connection00,
          MERKLE_HASH_VERSIONS.ONE,
        )
          .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
          .withBalance(asset, createAmount(100, asset.decimals))
          .build();

        const account03 = await AccountBuilder.account(
          connection03,
          MERKLE_HASH_VERSIONS.TWO,
        )
          .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
          .build();

        await registerCrosschainAsset(
          connection01.client,
          adminUser(connection01.client.config.merkleHashVersion)
            .signatureProvider,
          asset.id,
          multichain03.rid,
        );

        const initTb = transactionBuilder(
          account00.authenticator,
          connection00.client,
        );

        const applyTb = transactionBuilder(
          noopAuthenticator,
          connection03.client,
        );

        await initApplyCancelUnapplyCrosschainTransfer(
          account03.id,
          asset,
          [multichain03.rid, multichain01.rid],
          Date.now() + 5000,
          initTb,
          applyTb,
          connection01,
          connection03,
        );
      });
    });

    describe("accounts are registered using transfer open once assets are send to the account", () => {
      it("inits and applies transfer", async () => {
        const asset = await getNewAsset(
          connection00.client,
          "crosschain-transfer-test-asset-compatibility04",
          "CROSSCHAIN-transfer-test-asset-compatibility04",
        );

        await registerCrosschainAsset(
          connection03.client,
          adminUser(connection03.client.config.merkleHashVersion)
            .signatureProvider,
          asset.id,
          multichain00.rid,
        );

        const account00 = await AccountBuilder.account(
          connection00,
          MERKLE_HASH_VERSIONS.ONE,
        )
          .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
          .withBalance(asset, createAmount(100, asset.decimals))
          .build();

        const sourceTb = transactionBuilder(
          account00.authenticator,
          connection00.client,
        );

        const destinationTb = transactionBuilder(
          noopAuthenticator,
          connection03.client,
        );

        const keyStore = createInMemoryFtKeyStore(
          encryption.makeKeyPair(),
          MERKLE_HASH_VERSIONS.ONE,
        );
        const unregisteredRecipientAccountId = gtv.gtvHash(
          keyStore.id,
          MERKLE_HASH_VERSIONS.TWO,
        );

        await initAndApplyCrosschainTransfer(
          unregisteredRecipientAccountId,
          asset,
          [multichain03.rid],
          sourceTb,
          destinationTb,
        );
      });

      it("inits and cancels expired transfer", async () => {
        const asset = await getNewAsset(
          connection00.client,
          "crosschain-transfer-test-asset-compatibility05",
          "CROSSCHAIN-transfer-test-asset-compatibility05",
        );

        await registerCrosschainAsset(
          connection03.client,
          adminUser(connection03.client.config.merkleHashVersion)
            .signatureProvider,
          asset.id,
          multichain00.rid,
        );

        const account00 = await AccountBuilder.account(
          connection00,
          MERKLE_HASH_VERSIONS.ONE,
        )
          .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
          .withBalance(asset, createAmount(100, asset.decimals))
          .build();

        const sourceTb = transactionBuilder(
          account00.authenticator,
          connection00.client,
        );

        const destinationTb = transactionBuilder(
          noopAuthenticator,
          connection03.client,
        );

        const keyStore = createInMemoryFtKeyStore(
          encryption.makeKeyPair(),
          MERKLE_HASH_VERSIONS.ONE,
        );
        const unregisteredRecipientAccountId = gtv.gtvHash(
          keyStore.id,
          MERKLE_HASH_VERSIONS.TWO,
        );

        await initAndCancelCrosschainTransfer(
          unregisteredRecipientAccountId,
          asset,
          [multichain03.rid],
          Date.now(),
          sourceTb,
          destinationTb,
          connection03,
        );
      });

      it("inits applies cancels and unapplies a transfer", async () => {
        const asset = await getNewAsset(
          connection00.client,
          "crosschain-transfer-test-asset-compatibility06",
          "CROSSCHAIN-transfer-test-asset-compatibility06",
        );

        await registerCrosschainAsset(
          connection03.client,
          adminUser(connection03.client.config.merkleHashVersion)
            .signatureProvider,
          asset.id,
          multichain00.rid,
        );

        const account00 = await AccountBuilder.account(
          connection00,
          MERKLE_HASH_VERSIONS.ONE,
        )
          .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
          .withBalance(asset, createAmount(100, asset.decimals))
          .build();

        await registerCrosschainAsset(
          connection01.client,
          adminUser(connection01.client.config.merkleHashVersion)
            .signatureProvider,
          asset.id,
          multichain03.rid,
        );

        const initTb = transactionBuilder(
          account00.authenticator,
          connection00.client,
        );

        const applyTb = transactionBuilder(
          noopAuthenticator,
          connection03.client,
        );

        const keyStore = createInMemoryFtKeyStore(
          encryption.makeKeyPair(),
          MERKLE_HASH_VERSIONS.ONE,
        );
        const unregisteredRecipientAccountId = gtv.gtvHash(
          keyStore.id,
          MERKLE_HASH_VERSIONS.TWO,
        );

        await initApplyCancelUnapplyCrosschainTransfer(
          unregisteredRecipientAccountId,
          asset,
          [multichain03.rid, multichain01.rid],
          Date.now() + 5000,
          initTb,
          applyTb,
          connection01,
          connection03,
        );
      });
    });
  });

  describe("multichain03 uses merkleHashVersion 2, multichain00 uses merklehashVersion 1 and multichain04 uses merkleHashVersion 2", () => {
    let connection03: Connection;
    let connection00: Connection;
    let connection04: Connection;
    beforeAll(async () => {
      connection03 = createConnection(
        await createChromiaClientToMultichain(
          multichain03.rid,
          NODE_URL,
          MERKLE_HASH_VERSIONS.TWO,
        ),
      );

      connection00 = createConnection(
        await createChromiaClientToMultichain(
          multichain00.rid,
          NODE_URL,
          MERKLE_HASH_VERSIONS.ONE,
        ),
      );

      connection04 = createConnection(
        await createChromiaClientToMultichain(
          multichain04.rid,
          NODE_URL,
          MERKLE_HASH_VERSIONS.TWO,
        ),
      );
    });
    describe("accounts are registered before transfer", () => {
      it("inits and applies transfer", async () => {
        const asset = await getNewAsset(
          connection03.client,
          "crosschain-transfer-test-asset-compatibility07",
          "CROSSCHAIN-transfer-test-asset-compatibility07",
        );

        await registerCrosschainAsset(
          connection00.client,
          adminUser(connection00.client.config.merkleHashVersion)
            .signatureProvider,
          asset.id,
          multichain03.rid,
        );

        const account03 = await AccountBuilder.account(
          connection03,
          MERKLE_HASH_VERSIONS.TWO,
        )
          .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
          .withBalance(asset, createAmount(100, asset.decimals))
          .build();

        const account00 = await AccountBuilder.account(
          connection00,
          MERKLE_HASH_VERSIONS.ONE,
        )
          .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
          .build();

        const sourceTb = transactionBuilder(
          account03.authenticator,
          connection03.client,
        );

        const destinationTb = transactionBuilder(
          noopAuthenticator,
          connection00.client,
        );

        await initAndApplyCrosschainTransfer(
          account00.id,
          asset,
          [multichain00.rid],
          sourceTb,
          destinationTb,
        );
      });

      it("inits and cancels expired transfer", async () => {
        const asset = await getNewAsset(
          connection03.client,
          "crosschain-transfer-test-asset-compatibility08",
          "CROSSCHAIN-transfer-test-asset-compatibility08",
        );

        await registerCrosschainAsset(
          connection00.client,
          adminUser(connection00.client.config.merkleHashVersion)
            .signatureProvider,
          asset.id,
          multichain03.rid,
        );

        const account03 = await AccountBuilder.account(
          connection03,
          MERKLE_HASH_VERSIONS.TWO,
        )
          .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
          .withBalance(asset, createAmount(100, asset.decimals))
          .build();

        const account00 = await AccountBuilder.account(
          connection00,
          MERKLE_HASH_VERSIONS.ONE,
        )
          .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
          .build();

        const sourceTb = transactionBuilder(
          account03.authenticator,
          connection03.client,
        );

        const destinationTb = transactionBuilder(
          noopAuthenticator,
          connection00.client,
        );

        await initAndCancelCrosschainTransfer(
          account00.id,
          asset,
          [multichain00.rid],
          Date.now(),
          sourceTb,
          destinationTb,
          connection00,
        );
      });

      it("inits applies cancels and unapplies a transfer", async () => {
        const asset = await getNewAsset(
          connection03.client,
          "crosschain-transfer-test-asset-compatibility09",
          "CROSSCHAIN-transfer-test-asset-compatibility09",
        );

        await registerCrosschainAsset(
          connection00.client,
          adminUser(connection00.client.config.merkleHashVersion)
            .signatureProvider,
          asset.id,
          multichain03.rid,
        );

        const account03 = await AccountBuilder.account(
          connection03,
          MERKLE_HASH_VERSIONS.TWO,
        )
          .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
          .withBalance(asset, createAmount(100, asset.decimals))
          .build();

        const account00 = await AccountBuilder.account(
          connection00,
          MERKLE_HASH_VERSIONS.ONE,
        )
          .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
          .build();

        await registerCrosschainAsset(
          connection04.client,
          adminUser(connection04.client.config.merkleHashVersion)
            .signatureProvider,
          asset.id,
          multichain00.rid,
        );

        const initTb = transactionBuilder(
          account03.authenticator,
          connection03.client,
        );

        const applyTb = transactionBuilder(
          noopAuthenticator,
          connection00.client,
        );

        await initApplyCancelUnapplyCrosschainTransfer(
          account00.id,
          asset,
          [multichain00.rid, multichain04.rid],
          Date.now() + 5000,
          initTb,
          applyTb,
          connection04,
          connection00,
        );
      });
    });

    describe("accounts are registered using transfer open once assets are send to the account", () => {
      it("inits and applies transfer", async () => {
        const asset = await getNewAsset(
          connection03.client,
          "crosschain-transfer-test-asset-compatibility10",
          "CROSSCHAIN-transfer-test-asset-compatibility10",
        );

        await registerCrosschainAsset(
          connection00.client,
          adminUser(connection00.client.config.merkleHashVersion)
            .signatureProvider,
          asset.id,
          multichain03.rid,
        );

        const account03 = await AccountBuilder.account(
          connection03,
          MERKLE_HASH_VERSIONS.TWO,
        )
          .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
          .withBalance(asset, createAmount(100, asset.decimals))
          .build();

        const sourceTb = transactionBuilder(
          account03.authenticator,
          connection03.client,
        );

        const destinationTb = transactionBuilder(
          noopAuthenticator,
          connection00.client,
        );

        const keyStore = createInMemoryFtKeyStore(
          encryption.makeKeyPair(),
          MERKLE_HASH_VERSIONS.ONE,
        );
        const unregisteredRecipientAccountId = gtv.gtvHash(
          keyStore.id,
          MERKLE_HASH_VERSIONS.ONE,
        );

        await initAndApplyCrosschainTransfer(
          unregisteredRecipientAccountId,
          asset,
          [multichain00.rid],
          sourceTb,
          destinationTb,
        );
      });

      it("inits and cancels expired transfer", async () => {
        const asset = await getNewAsset(
          connection03.client,
          "crosschain-transfer-test-asset-compatibility11",
          "CROSSCHAIN-transfer-test-asset-compatibility11",
        );

        await registerCrosschainAsset(
          connection00.client,
          adminUser(connection00.client.config.merkleHashVersion)
            .signatureProvider,
          asset.id,
          multichain03.rid,
        );

        const account03 = await AccountBuilder.account(
          connection03,
          MERKLE_HASH_VERSIONS.TWO,
        )
          .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
          .withBalance(asset, createAmount(100, asset.decimals))
          .build();

        const sourceTb = transactionBuilder(
          account03.authenticator,
          connection03.client,
        );

        const destinationTb = transactionBuilder(
          noopAuthenticator,
          connection00.client,
        );

        const keyStore = createInMemoryFtKeyStore(
          encryption.makeKeyPair(),
          MERKLE_HASH_VERSIONS.ONE,
        );
        const unregisteredRecipientAccountId = gtv.gtvHash(
          keyStore.id,
          MERKLE_HASH_VERSIONS.ONE,
        );

        await initAndCancelCrosschainTransfer(
          unregisteredRecipientAccountId,
          asset,
          [multichain00.rid],
          Date.now(),
          sourceTb,
          destinationTb,
          connection00,
        );
      });

      it("inits applies cancels and unapplies a transfer", async () => {
        const asset = await getNewAsset(
          connection03.client,
          "crosschain-transfer-test-asset-compatibility12",
          "CROSSCHAIN-transfer-test-asset-compatibility12",
        );

        await registerCrosschainAsset(
          connection00.client,
          adminUser(connection00.client.config.merkleHashVersion)
            .signatureProvider,
          asset.id,
          multichain03.rid,
        );

        const account03 = await AccountBuilder.account(
          connection03,
          MERKLE_HASH_VERSIONS.TWO,
        )
          .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
          .withBalance(asset, createAmount(100, asset.decimals))
          .build();

        await registerCrosschainAsset(
          connection04.client,
          adminUser(connection04.client.config.merkleHashVersion)
            .signatureProvider,
          asset.id,
          multichain00.rid,
        );

        const initTb = transactionBuilder(
          account03.authenticator,
          connection03.client,
        );

        const applyTb = transactionBuilder(
          noopAuthenticator,
          connection00.client,
        );

        const keyStore = createInMemoryFtKeyStore(
          encryption.makeKeyPair(),
          MERKLE_HASH_VERSIONS.ONE,
        );
        const unregisteredRecipientAccountId = gtv.gtvHash(
          keyStore.id,
          MERKLE_HASH_VERSIONS.ONE,
        );

        await initApplyCancelUnapplyCrosschainTransfer(
          unregisteredRecipientAccountId,
          asset,
          [multichain00.rid, multichain04.rid],
          Date.now() + 5000,
          initTb,
          applyTb,
          connection04,
          connection00,
        );
      });
    });
  });

  describe("completes successful crosschain transfers between chains with the same merkleHashVersion", () => {
    let connection00: Connection;
    let connection01: Connection;
    let connection03: Connection;
    let connection04: Connection;

    beforeAll(async () => {
      connection00 = createConnection(
        await createChromiaClientToMultichain(
          multichain00.rid,
          NODE_URL,
          MERKLE_HASH_VERSIONS.ONE,
        ),
      );

      connection01 = createConnection(
        await createChromiaClientToMultichain(
          multichain01.rid,
          NODE_URL,
          MERKLE_HASH_VERSIONS.ONE,
        ),
      );

      connection03 = createConnection(
        await createChromiaClientToMultichain(
          multichain03.rid,
          NODE_URL,
          MERKLE_HASH_VERSIONS.TWO,
        ),
      );

      connection04 = createConnection(
        await createChromiaClientToMultichain(
          multichain04.rid,
          NODE_URL,
          MERKLE_HASH_VERSIONS.TWO,
        ),
      );
    });

    it("multichain00 and multichain01 use merkleHashVersion 1", async () => {
      const asset = await getNewAsset(
        connection00.client,
        "crosschain-transfer-test-asset-compatibility13",
        "CROSSCHAIN-transfer-test-asset-compatibility13",
      );

      await registerCrosschainAsset(
        connection01.client,
        adminUser(connection01.client.config.merkleHashVersion)
          .signatureProvider,
        asset.id,
        multichain00.rid,
      );

      const account00 = await AccountBuilder.account(
        connection00,
        MERKLE_HASH_VERSIONS.ONE,
      )
        .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
        .withBalance(asset, createAmount(100, asset.decimals))
        .build();

      const account01 = await AccountBuilder.account(
        connection01,
        MERKLE_HASH_VERSIONS.ONE,
      )
        .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
        .build();

      let balanceOnChain00 = (
        await account00.getBalanceByAssetId(asset.id)
      )?.amount.value.toString();

      let balanceOnChain01 = (
        await account01.getBalanceByAssetId(asset.id)
      )?.amount.value.toString();

      expect(balanceOnChain00).toEqual("100");
      expect(balanceOnChain01).toBe(undefined);

      const sourceTb = transactionBuilder(
        account00.authenticator,
        connection00.client,
      );

      const destinationTb = transactionBuilder(
        noopAuthenticator,
        connection01.client,
      );

      await initAndApplyCrosschainTransfer(
        account01.id,
        asset,
        [multichain01.rid],
        sourceTb,
        destinationTb,
      );

      balanceOnChain00 = (
        await account00.getBalanceByAssetId(asset.id)
      )?.amount.value.toString();

      balanceOnChain01 = (
        await account01.getBalanceByAssetId(asset.id)
      )?.amount.value.toString();

      expect(balanceOnChain00).toBe(undefined);
      expect(balanceOnChain01).toEqual("100");
    });

    it("multichain03 and multichain04 use merkleHashVersion 2", async () => {
      const asset = await getNewAsset(
        connection03.client,
        "crosschain-transfer-test-asset-compatibility14",
        "CROSSCHAIN-transfer-test-asset-compatibility14",
      );

      await registerCrosschainAsset(
        connection04.client,
        adminUser(connection04.client.config.merkleHashVersion)
          .signatureProvider,
        asset.id,
        multichain03.rid,
      );

      const account03 = await AccountBuilder.account(
        connection03,
        MERKLE_HASH_VERSIONS.TWO,
      )
        .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
        .withBalance(asset, createAmount(100, asset.decimals))
        .build();

      const account04 = await AccountBuilder.account(
        connection04,
        MERKLE_HASH_VERSIONS.TWO,
      )
        .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
        .build();

      let balanceOnChain03 = (
        await account03.getBalanceByAssetId(asset.id)
      )?.amount.value.toString();

      let balanceOnChain04 = (
        await account04.getBalanceByAssetId(asset.id)
      )?.amount.value.toString();

      expect(balanceOnChain03).toEqual("100");
      expect(balanceOnChain04).toBe(undefined);

      const sourceTb = transactionBuilder(
        account03.authenticator,
        connection03.client,
      );

      const destinationTb = transactionBuilder(
        noopAuthenticator,
        connection04.client,
      );

      await initAndApplyCrosschainTransfer(
        account04.id,
        asset,
        [multichain04.rid],
        sourceTb,
        destinationTb,
      );

      balanceOnChain03 = (
        await account03.getBalanceByAssetId(asset.id)
      )?.amount.value.toString();

      balanceOnChain04 = (
        await account04.getBalanceByAssetId(asset.id)
      )?.amount.value.toString();

      expect(balanceOnChain03).toBe(undefined);
      expect(balanceOnChain04).toEqual("100");
    });
  });
});
