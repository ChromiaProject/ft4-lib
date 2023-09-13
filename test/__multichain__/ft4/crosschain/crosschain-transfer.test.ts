import { IClient, createIccfProofTx, gtv, gtx } from "postchain-client";
import {
  createChromiaClient,
  createChromiaClientToMultichain,
  getNewAsset,
} from "/util/blockchain-util";
import {
  FlagsType,
  createAmount,
  createConnection,
  getInitTransferArgs,
  mint,
  registerCrosschainAsset,
} from "/ft4";
import adminUser from "/util/admin_user";
import AccountBuilder from "/util/account-builder";
import {
  applyTransfer as applyTransferOp,
  initTransfer,
} from "/ft4/crosschain/crosschain-operations";
import {
  OnAnchoredHandler,
  transactionBuilder,
} from "/ft4/utils/transaction-builder";
import { getTransactionRID } from "/ft4/utils";

interface Blockchain {
  name: string;
  rid: Buffer;
  state: string;
  system: number;
}

describe("Crosschain transfer", () => {
  let directoryClient: IClient;

  beforeAll(async () => {
    directoryClient = await createChromiaClient();
  });

  test("transfers successfully with one hop", async () => {
    const blockchains = (await directoryClient.query("get_blockchains", {
      include_inactive: false,
    })) as unknown as Blockchain[];

    const anchoring = blockchains.find((b) => b.name === "c0");
    const multichain00 = blockchains.find((b) => b.name === "multichain00");
    const multichain01 = blockchains.find((b) => b.name === "multichain01");

    const clientAnchoring = await createChromiaClientToMultichain(
      anchoring.rid,
    );
    const connection00 = createConnection(
      await createChromiaClientToMultichain(multichain00.rid),
    );
    const connection01 = createConnection(
      await createChromiaClientToMultichain(multichain01.rid),
    );

    const asset00 = await getNewAsset(connection00.client);
    await registerCrosschainAsset(
      connection01.client,
      adminUser().signatureProvider,
      asset00,
      multichain00.rid,
    );

    const account00 = await AccountBuilder.account(connection00)
      .withAuthFlags(FlagsType.Account, FlagsType.Transfer)
      .build();

    const account01 = await AccountBuilder.account(connection01)
      .withAuthFlags(FlagsType.Account, FlagsType.Transfer)
      .build();

    await mint(
      connection00.client,
      adminUser().signatureProvider,
      account00.id,
      asset00.id,
      createAmount(100, asset00.decimals),
    );

    const tb = transactionBuilder(account00.authenticator, connection00.client);

    await new Promise<void>((resolve) => {
      const initOperation = initTransfer(
        account01.id,
        asset00.id,
        createAmount(100, asset00.decimals),
        [multichain01.rid],
      );

      const onAnchoringHandler: OnAnchoredHandler = async (_, tx) => {
        const decodedTx = gtx.deserialize(tx);
        const proofTx = await createIccfProofTx(
          clientAnchoring,
          getTransactionRID(tx),
          gtv.gtvHash(decodedTx),
          decodedTx.signers,
          multichain00.rid.toString("hex"),
          multichain01.rid.toString("hex"),
        );
        const newTx = proofTx.iccfTx;
        console.log(newTx.operations[0].args);
        newTx.operations.push(
          applyTransferOp(
            getInitTransferArgs(
              account01.id,
              asset00.id,
              createAmount(100, asset00.decimals),
              [multichain01.rid],
            ),
            tx,
            1,
            0,
          ),
        );
        await connection01.client.sendTransaction(newTx);
        resolve();
      };

      tb.add(initOperation, onAnchoringHandler).buildAndSend();
    });

    expect(await account01.getBalanceByAssetId(asset00.id)).toEqual(
      createAmount(100, asset00.decimals),
    );
  });
});
