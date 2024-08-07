import {
  AccountBuilder,
  adminUser,
  createChromiaClientToMultichain,
  fetchBlockchains,
  getNewAsset,
} from "@ft4-test/util";
import { AuthFlag } from "@ft4/accounts";
import { registerCrosschainAsset } from "@ft4/admin";
import { createAmount } from "@ft4/asset";
import { noopAuthenticator } from "@ft4/authentication";
import { applyTransfer, initTransfer } from "@ft4/crosschain";
import { createConnection } from "@ft4/ft-session";
import { transactionBuilder } from "@ft4/transaction-builder";
import { BufferId } from "@ft4/utils";
// import { getSystemAnchoringChain } from "@ft4/utils/directory-chain";
import { Operation, RawGtx, gtx } from "postchain-client";

describe("Crosschain transfer", () => {
  test("transfers successfully with one hop", async () => {
    const { multichain00, multichain01 } = await fetchBlockchains();

    const connection00 = createConnection(
      await createChromiaClientToMultichain(multichain00.rid),
    );
    const connection01 = createConnection(
      await createChromiaClientToMultichain(multichain01.rid),
    );

    const asset00 = await getNewAsset(
      connection00.client,
      "crosschain-transfer-test-asset",
      "CROSSCHAIN-transfer-test-asset",
    );
    await registerCrosschainAsset(
      connection01.client,
      adminUser().signatureProvider,
      asset00.id,
      multichain00.rid,
    );
    const account00 = await AccountBuilder.account(connection00)
      .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
      .withBalance(asset00, createAmount(100, asset00.decimals))
      .build();

    const account01 = await AccountBuilder.account(connection01)
      .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
      .build();

    const tb = transactionBuilder(account00.authenticator, connection00.client);

    const initOperation = initTransfer(
      account01.id,
      asset00.id,
      createAmount(100, asset00.decimals),
      [multichain01.rid],
      10000000000000,
    );

    let transferTransactionRid: Buffer | undefined = undefined;
    await new Promise<void>((resolve, reject) => {
      const onAnchoredHandler = async (
        data: {
          operation: Operation;
          opIndex: number;
          tx: RawGtx;
          createProof: (blockchainRid: BufferId) => Promise<Operation>;
        } | null,
        error: Error | null,
      ) => {
        if (error) {
          await getAncoredBlocks();
          reject(error);
          return;
        }
        if (!data) {
          reject(new Error("No data provided"));
          return;
        }
        const iccfProofOperation = await data.createProof(multichain01.rid);
        try {
          await transactionBuilder(account00.authenticator, connection01.client)
            .add(iccfProofOperation, {
              authenticator: noopAuthenticator,
            })
            .add(
              applyTransfer(data.tx, data.opIndex, data.tx, data.opIndex, 0),
              { authenticator: noopAuthenticator },
            )
            .buildAndSend();
        } catch (error) {
          reject(error);
        }

        resolve();
      };

      tb.add(initOperation, { onAnchoredHandler })
        .buildAndSendWithAnchoring()
        .on("confirmed", (receipt) => {
          console.log("TRANSACTION INIT::::::::::::::::::");
          console.log(receipt.transactionRid);
          fetch(
            `http://docker:7740/transactions/${multichain00.rid.toString("hex")}/${receipt.transactionRid.toString("hex")}`,
          ).then((res) => {
            res
              .json()
              .then((jsonresp) =>
                console.log("JSON RESPONSE#########", jsonresp),
              );
          });
        })
        .then((res) => {
          transferTransactionRid = res.receipt.transactionRid;
        });
    });

    expect(
      (await account01.getBalanceByAssetId(asset00.id))?.amount.value,
    ).toEqual(createAmount(100, asset00.decimals).value);

    const history = await account00.getTransferHistory();

    const entry = history.data[0];
    expect(entry.isInput).toEqual(true);
    expect(entry.operationName).toEqual(initOperation.name);
    expect(entry.delta.value).toEqual(100n);
    expect(entry.asset.id).toEqual(asset00.id);
    expect(entry.transactionId).toEqual(transferTransactionRid);
    expect(entry.opIndex).toEqual(1);
    expect(entry.isCrosschain).toBeTruthy();

    const transferDetails = await connection00.getTransferDetails(
      transferTransactionRid!,
      entry.opIndex,
    );
    expect(transferDetails.length).toEqual(2);
    // expect(transferDetails[0].blockchainRid).toEqual(multichain01.rid);
    expect(transferDetails[0].blockchainRid).toEqual(multichain00.rid);
    expect(transferDetails[0].accountId).toEqual(account00.id);
    expect(transferDetails[0].assetId).toEqual(asset00.id);
    expect(transferDetails[0].delta).toEqual(100n);
    expect(transferDetails[0].isInput).toEqual(true);
    expect(transferDetails[1].blockchainRid).toEqual(multichain01.rid);
    expect(transferDetails[1].assetId).toEqual(asset00.id);
    expect(transferDetails[1].delta).toEqual(100n);
    expect(transferDetails[1].isInput).toEqual(false);
  });
});

async function getAncoredBlocks() {
  const nodeUrl = "http://docker:7740";
  // const nodeUrl = "http://thedockerhost:7740";
  const clusterAnchoringBrid =
    "9302b8dcc616d989b9390b1752b6a94ebd8a18c8a615c094e9068b4da765d5c1";
  // const dappBrid = "BDC5C54EB3D17BCFD5DF6CE08EE3C51C270A5DE5608B306250FE792953DA3465";
  const dappBrid =
    "A115380C08EA554B3E39AFACEE4C6A7E6D4D6D26974493A4AD102A48F0584951";

  // [DEBUG] Added multichain00 with BRID: A115380C08EA554B3E39AFACEE4C6A7E6D4D6D26974493A4AD102A48F0584951
  // [DEBUG] Added multichain01 with BRID: BDC5C54EB3D17BCFD5DF6CE08EE3C51C270A5DE5608B306250FE792953DA3465
  // [DEBUG] Added multichain02 with BRID: 10363A7B3973DA956ED4FA3D8A35ADD3A661E519744059DC3BC582C7D9C5C2BC

  const response = await fetch(
    `${nodeUrl}/blocks/${clusterAnchoringBrid}?limit=100&txs=true`,
  );
  const json = await response.json();

  const txs = json.reduce(
    (allTransactions, block) => [...allTransactions, ...block.transactions],
    [],
  );

  let anchorBlockHeaderOps: any = [];

  for (const tx of txs) {
    // console.log("transaction: ", tx);
    const decodedTx = gtx.deserialize(Buffer.from(tx.data, "hex"));
    const ops = decodedTx.operations;
    anchorBlockHeaderOps = [
      ...anchorBlockHeaderOps,
      ...ops.filter((op) => op.opName === "__anchor_block_header"),
    ];
  }

  if (!anchorBlockHeaderOps.length) {
    throw new Error(
      "Didn't find __anchor_block_header operation in last block",
    );
  }

  console.log("------------- Anchored chains:");
  anchorBlockHeaderOps.forEach(({ args }) => {
    const headerInfo = args[1];
    if (!headerInfo[0].equals(Buffer.from(dappBrid, "hex"))) return;
    console.log(
      `Blockchain ${headerInfo[0].toString("hex")}, block ${headerInfo[1].toString("hex")}`,
    );
  });

  const _lastAnchoredBlock = anchorBlockHeaderOps.find(({ args }) => {
    const headerInfo = args[1];
    return headerInfo[0].equals(Buffer.from(dappBrid, "hex"));
  });

  if (!_lastAnchoredBlock) {
    throw new Error(`Cannot find anchoring transaction for chain `);
  }

  const lastAnchoredBlock = _lastAnchoredBlock.args[1][1].toString("hex");
  console.log(`last anchored block: ${lastAnchoredBlock}`);

  const latestBlock = await fetch(
    `${nodeUrl}/blocks/${dappBrid}?limit=1&txs=true`,
  );
  console.log(`Latest block height ${(await latestBlock.json())[0].height}`);

  const response2 = await fetch(
    `${nodeUrl}/blocks/${dappBrid}/${lastAnchoredBlock}?txs=true`,
  );
  const dappBlock = await response2.json();
  console.log(`dapp block reposnse: ${dappBlock}`);
  console.log(`Latest anchored block height ${dappBlock.height}`);

  const allBlocksResponse = await fetch(
    `${nodeUrl}/blocks/${dappBrid}?limit=20&txs=true`,
  );
  const blocks = await allBlocksResponse.json();
  blocks.forEach(({ rid }) => console.log(rid));
}
