import { Operation, RawGtx } from "postchain-client";
import {
  createChromiaClientToMultichain,
  getNewAsset,
} from "../../../util/blockchain-util";
import {
  FlagsType,
  createAmount,
  createConnection,
  registerCrosschainAsset,
} from "@ft4/index";
import adminUser from "../../../util/admin_user";
import AccountBuilder from "../../../util/account-builder";
import {
  applyTransfer as applyTransferOp,
  initTransfer as initTransferOp,
} from "@ft4/crosschain/operations";
import { transactionBuilder } from "@ft4/utils/transaction-builder";
import { fetchBlockchains } from "../../util/blockchain";
import { BufferId } from "@ft4/utils/types";

jest.unmock("postchain-client");

describe("Crosschain transfer", () => {
  test("transfers successfully with one hop", async () => {
    const { multichain00, multichain01 } = await fetchBlockchains();

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
      .withBalance(asset00, createAmount(100, asset00.decimals))
      .build();

    const account01 = await AccountBuilder.account(connection01)
      .withAuthFlags(FlagsType.Account, FlagsType.Transfer)
      .build();

    const tb = transactionBuilder(account00.authenticator, connection00.client);

    await new Promise<void>((resolve) => {
      const initOperation = initTransferOp(
        account01.id,
        asset00.id,
        createAmount(100, asset00.decimals),
        [multichain01.rid],
      );

      const onAnchoringHandler = async (
        data: {
          operation: Operation;
          opIndex: number;
          tx: RawGtx;
          createProof: (blockchainRid: BufferId) => Promise<Operation>;
        } | null,
        error: Error | null,
      ) => {
        if (error) {
          throw error;
        }
        if (!data) {
          throw new Error("No data provided");
        }
        const iccfProofOperation = await data.createProof(multichain01.rid);

        await connection01.client.sendTransaction({
          operations: [
            iccfProofOperation,
            applyTransferOp(data.tx, data.tx, 0),
          ],
          signers: [],
        });
        resolve();
      };

      tb.add(initOperation, onAnchoringHandler).buildAndSend();
    });

    expect(
      (await account01.getBalanceByAssetId(asset00.id))?.amount.value,
    ).toEqual(createAmount(100, asset00.decimals).value);
  });
});
