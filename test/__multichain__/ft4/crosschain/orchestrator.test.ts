import { IClient, createClient, encryption } from "postchain-client";
import { fetchBlockchains } from "/__multichain__/util/blockchain";
import {
  authDescriptor,
  createAmount,
  createInMemoryEvmKeyStore,
  createKeyStoreInteractor,
} from "/ft4";
import { createOrchestrator } from "/ft4/crosschain/orchestrator";
import { Session } from "/ft4/types";
import { createAccount } from "/util/util";
import { getNewAsset } from "/util/blockchain-util";

describe("Orchestrator", () => {
  let client: IClient;
  let session: Session;
  let assetId: Buffer;
  let targetChainRid: Buffer;

  const recipientId = Buffer.from("recipientId");
  const amount = createAmount(100, 1);

  beforeEach(async () => {
    const { multichain00, multichain02 } = await fetchBlockchains();

    client = await createClient({
      nodeURLPool: "http://127.0.0.1:7740",
      blockchainRID: multichain00.rid.toString("hex"),
    });

    const keyPair = encryption.makeKeyPair();

    const keyStore = createInMemoryEvmKeyStore(keyPair);
    const ad = authDescriptor.create.singleSig.withArgs(
      [],
      keyStore.address,
    ).andNoRules;
    await createAccount(client, ad);

    session = await createKeyStoreInteractor(client, keyStore).getSession(
      ad.id,
    );

    assetId = (await getNewAsset(client)).id;
    targetChainRid = multichain02.rid;
  });

  it.only("should execute transfer through all paths", async () => {
    const orchestrator = await createOrchestrator(
      targetChainRid,
      recipientId,
      amount,
      assetId,
      session,
    );

    const initListener = jest.fn();
    const hopListener = jest.fn();
    const endListener = jest.fn();

    orchestrator.onTransferInit(initListener);
    orchestrator.onTransferHop(hopListener);
    orchestrator.onTransferEnd(endListener);

    await orchestrator.transfer();

    expect(initListener).toHaveBeenCalled();
    expect(hopListener).toHaveBeenCalledTimes(2);
    expect(endListener).toHaveBeenCalled();
  });

  it("should emit error event on failure", async () => {
    // This is a mock to induce an error in the transfer
    jest.mock("/ft4/utils/transaction-builder", () => {
      return {
        transactionBuilder: () => {
          throw new Error("Mocked Error");
        },
      };
    });

    const orchestrator = await createOrchestrator(
      targetChainRid,
      recipientId,
      amount,
      assetId,
      session,
    );
    const errorListener = jest.fn();

    orchestrator.onTransferError(errorListener);

    await orchestrator.transfer();

    expect(errorListener).toHaveBeenCalled();
  });
});
