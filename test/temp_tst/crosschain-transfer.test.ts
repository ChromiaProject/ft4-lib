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
import { Operation, RawGtx } from "postchain-client";

describe("Crosschain transfer", () => {
  test("transfers successfully with one hop", async () => {
    console.log("entry 1");
    const { multichain00, multichain01 } = await fetchBlockchains();

    const connection00 = createConnection(
      await createChromiaClientToMultichain(multichain00.rid),
    );
    const connection01 = createConnection(
      await createChromiaClientToMultichain(multichain01.rid),
    );

    // const client = await createClient({
    //   // nodeUrlPool: "http://thedockerhost:7740",
    //   nodeUrlPool: "http://docker:7740",
    //   blockchainIid: 0,
    // });

    // const temp = await getSystemAnchoringChain(client);
    // const clusterAnchorString =
    //   "93 02 b8 dc c6 16 d9 89 b9 39 0b 17 52 b6 a9 4e bd 8a 18 c8 a6 15 c0 94 e9 06 8b 4d a7 65 d5 c1".replace(
    //     " ",
    //     "",
    //   );
    // const clusterAnchorString =
    //   "9302b8dcc616d989b9390b1752b6a94ebd8a18c8a615c094e9068b4da765d5c1";
    // const clusterAnchor = await createClient({
    //   // nodeUrlPool: "http://thedockerhost:7740",
    //   nodeUrlPool: "http://docker:7740",
    //   blockchainRid: clusterAnchorString,
    // });

    // console.log("LIKE A GLOVE##################");
    // console.log(temp);
    // const clientAnchor = await createClient({
    //   // nodeUrlPool: "http://thedockerhost:7740",
    //   nodeUrlPool: "http://docker:7740",
    //   blockchainRid: temp.toString("hex"),
    // });

    // const tempBlock = await clientAnchor.getLatestBlock();
    // const tempBlock2 = await clusterAnchor.getLatestBlock();
    // console.log("TEMP BLOCK##################");
    // console.log(tempBlock);
    // console.log("LIKE A GLOVE##################");
    // console.log("TEMP BLOCK2222##################");
    // console.log(tempBlock2);
    // console.log("LIKE A GLOVE222##################");

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
    // await registerCrosschainAsset(
    //   connection01.client,
    //   adminUser().signatureProvider,
    //   asset00.id,
    //   multichain00.rid,
    // );

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
