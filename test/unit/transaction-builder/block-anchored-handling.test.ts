const clusterAnchoringClient = "clusterAnchoringClient";
const mockOperation: Operation = {
  name: "testOperation",
  args: [],
};

jest.mock("postchain-client", () => {
  const originalModule = jest.requireActual("postchain-client");

  return {
    __esModule: true,
    ...originalModule,
    isBlockAnchored: jest.fn().mockResolvedValue(false),
    getBlockAnchoringTransaction: jest
      .fn()
      .mockRejectedValue(new originalModule.BlockAnchoringException()),
    getAnchoringClient: jest.fn().mockResolvedValue(clusterAnchoringClient),
    createClient: jest.fn(
      (settings: NetworkSettings) => settings.nodeUrlPool![0],
    ),
  };
});

jest.mock("@ft4/utils/directory-chain", () => {
  const originalModule = jest.requireActual("@ft4/utils");

  return {
    __esModule: true,
    ...originalModule,
    getDirectoryClient: jest.fn(),
    getSystemAnchoringChain: jest.fn().mockResolvedValue(Buffer.from("AA")),
    getBlockchainApiUrls: jest.fn((_client: IClient, blockchainRid: Buffer) => [
      formatter.toString(blockchainRid),
    ]),
  };
});

import {
  anchoredHandlerCallbackParameters,
  createFakeAuthDataService,
  createTestAuthDescriptor,
} from "@ft4-test/util";
import { AnyAuthDescriptor, AuthFlag, transfer } from "@ft4/accounts";
import { createAmount } from "@ft4/asset";
import {
  AuthDataService,
  Authenticator,
  KeyHandler,
  createAuthenticator,
  createInMemoryFtKeyStore,
  ftAuth,
} from "@ft4/authentication";
import { transactionBuilder } from "@ft4/transaction-builder";
import { nop } from "@ft4/utils";
import {
  BlockAnchoringException,
  IClient,
  KeyPair,
  NetworkSettings,
  Operation,
  SignedTransaction,
  TransactionReceipt,
  Web3PromiEvent,
  createStubClient,
  encryption,
  formatter,
  getBlockAnchoringTransaction,
  isBlockAnchored,
} from "postchain-client";

describe("block anchored handling", () => {
  let authenticator: Authenticator;
  let client: IClient;
  let keyPair: KeyPair;
  let authDescriptor: AnyAuthDescriptor;
  let keyHandler: KeyHandler;
  let authDataService: AuthDataService;

  beforeEach(async () => {
    client = await createStubClient();
    client.sendTransaction = jest.fn().mockReturnValue(
      new Web3PromiEvent((resolve, _reject) =>
        resolve({
          status: "confirmed",
          statusCode: 200,
          transactionRid: Buffer.alloc(32),
        }),
      ),
    );

    const { keyPair: pair, authDescriptor: ad } = createTestAuthDescriptor([
      AuthFlag.Transfer,
    ]);
    authDescriptor = ad;
    keyPair = pair;

    keyHandler =
      createInMemoryFtKeyStore(keyPair).createKeyHandler(authDescriptor);

    authDataService = createFakeAuthDataService({
      ["ft4.transfer"]: { flags: [AuthFlag.Transfer], message: "" },
      ["ft4.admin.register_account"]: {
        flags: [AuthFlag.Account],
        message: "",
      },
      ["testOperation"]: { flags: [], message: "" },
    });

    authenticator = createAuthenticator(
      encryption.randomBytes(32),
      [keyHandler],
      authDataService,
    );
  });

  it("does not allow build() when there are onAnchoredHandlers", async () => {
    const promise = transactionBuilder(authenticator, client)
      .add(transfer(Buffer.alloc(32), Buffer.alloc(32), createAmount(10, 0)), {
        onAnchoredHandler: (_data, _error) => null,
      })
      .build();
    await expect(promise).rejects.toThrow(Error);
  });

  it("does not allow buildAndSend() when there are onAnchoredHandlers", async () => {
    const promise = transactionBuilder(authenticator, client)
      .add(transfer(Buffer.alloc(32), Buffer.alloc(32), createAmount(10, 0)), {
        onAnchoredHandler: (_data, _error) => null,
      })
      .buildAndSend();
    await expect(promise).rejects.toThrow(Error);
  });

  it("calls registered handler when block is anchored in system anchoring chain", async () => {
    (getBlockAnchoringTransaction as jest.Mock).mockResolvedValueOnce({
      txRid: formatter.toBuffer("CA"),
    });
    (isBlockAnchored as jest.Mock).mockResolvedValueOnce(true);
    const operation = nop();
    const callback: jest.Mock = jest.fn();
    let signedEvent: SignedTransaction | undefined = undefined;
    let confirmedEvent: TransactionReceipt | undefined = undefined;
    const { tx, receipt } = await transactionBuilder(authenticator, client)
      .add(mockOperation, { onAnchoredHandler: callback })
      .add(operation)
      .buildAndSendWithAnchoring()
      .on("built", (tx) => {
        signedEvent = tx;
      })
      .on("confirmed", (receipt) => {
        confirmedEvent = receipt;
      });

    expect(callback).toHaveBeenCalledWith(
      anchoredHandlerCallbackParameters(
        client,
        [
          ftAuth(authenticator.accountId, authDescriptor.id),
          mockOperation,
          operation,
        ],
        1,
      ),
      null,
    );

    expect(signedEvent!.equals(tx));
    expect(confirmedEvent!.transactionRid.equals(receipt.transactionRid));
  }, 5000);

  it("calls all registered handler when block is anchored in system anchoring chain", async () => {
    (getBlockAnchoringTransaction as jest.Mock).mockResolvedValueOnce({
      txRid: formatter.toBuffer("CA"),
    });
    (isBlockAnchored as jest.Mock).mockResolvedValueOnce(true);
    const operation = nop();
    const callback: jest.Mock = jest.fn();
    const callback2: jest.Mock = jest.fn();
    await transactionBuilder(authenticator, client)
      .add(mockOperation, { onAnchoredHandler: callback })
      .add(mockOperation, { onAnchoredHandler: callback2 })
      .add(operation)
      .buildAndSendWithAnchoring();

    expect(callback).toHaveBeenCalledWith(
      anchoredHandlerCallbackParameters(
        client,
        [
          ftAuth(authenticator.accountId, authDescriptor.id),
          mockOperation,
          ftAuth(authenticator.accountId, authDescriptor.id),
          mockOperation,
          operation,
        ],
        1,
      ),
      null,
    );
    expect(callback2).toHaveBeenCalledWith(
      anchoredHandlerCallbackParameters(
        client,
        [
          ftAuth(authenticator.accountId, authDescriptor.id),
          mockOperation,
          ftAuth(authenticator.accountId, authDescriptor.id),
          mockOperation,
          operation,
        ],
        3,
      ),
      null,
    );
  }, 5000);

  it("calls callbacks even if block is not cluster anchored immediately", async () => {
    (getBlockAnchoringTransaction as jest.Mock)
      .mockRejectedValue(new BlockAnchoringException())
      .mockResolvedValueOnce({ txRid: formatter.toBuffer("CA") });
    (isBlockAnchored as jest.Mock).mockResolvedValueOnce(true);

    const operation = nop();
    const callback: jest.Mock = jest.fn();
    await transactionBuilder(authenticator, client)
      .add(mockOperation, { onAnchoredHandler: callback })
      .add(operation)
      .buildAndSendWithAnchoring();

    expect(callback).toHaveBeenCalledWith(
      anchoredHandlerCallbackParameters(
        client,
        [
          ftAuth(authenticator.accountId, authDescriptor.id),
          mockOperation,
          operation,
        ],
        1,
      ),
      null,
    );
  }, 5000);

  it("calls callbacks even if block is not system anchored immediately", async () => {
    (getBlockAnchoringTransaction as jest.Mock).mockResolvedValueOnce({
      txRid: formatter.toBuffer("CA"),
    });
    (isBlockAnchored as jest.Mock)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const operation = nop();
    const callback: jest.Mock = jest.fn();
    await transactionBuilder(authenticator, client)
      .add(mockOperation, { onAnchoredHandler: callback })
      .add(operation)
      .buildAndSendWithAnchoring();

    expect(callback).toHaveBeenCalledWith(
      anchoredHandlerCallbackParameters(
        client,
        [
          ftAuth(authenticator.accountId, authDescriptor.id),
          mockOperation,
          operation,
        ],
        1,
      ),
      null,
    );
  }, 5000);

  it("calls registered handler when block is anchored target cluster", async () => {
    const targetBlockchainRid1 = formatter.toBuffer("1111");
    const targetBlockchainRid2 = formatter.toBuffer("2222");

    (getBlockAnchoringTransaction as jest.Mock).mockResolvedValueOnce({
      txRid: formatter.toBuffer("CA"),
    });
    (isBlockAnchored as jest.Mock)
      .mockClear()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);
    const callback1: jest.Mock = jest.fn();
    const callback2: jest.Mock = jest.fn();
    const callback3: jest.Mock = jest.fn();
    await transactionBuilder(authenticator, client)
      .add(mockOperation, {
        targetBlockchainRid: targetBlockchainRid1,
        onAnchoredHandler: callback1,
      })
      .add(mockOperation, {
        targetBlockchainRid: targetBlockchainRid2,
        onAnchoredHandler: callback2,
      })
      .add(mockOperation, {
        targetBlockchainRid: targetBlockchainRid2,
        onAnchoredHandler: callback3,
      })
      .buildAndSendWithAnchoring();

    expect(isBlockAnchored).toHaveBeenCalledTimes(3);
    expect(isBlockAnchored).toHaveBeenNthCalledWith(
      1,
      clusterAnchoringClient,
      undefined,
      formatter.toBuffer("CA"),
    );
    expect(isBlockAnchored).toHaveBeenNthCalledWith(
      2,
      clusterAnchoringClient,
      formatter.toString(targetBlockchainRid1),
      formatter.toBuffer("CA"),
    );
    expect(isBlockAnchored).toHaveBeenNthCalledWith(
      3,
      clusterAnchoringClient,
      formatter.toString(targetBlockchainRid2),
      formatter.toBuffer("CA"),
    );

    expect(callback1).toHaveBeenCalledWith(
      anchoredHandlerCallbackParameters(
        client,
        [
          ftAuth(authenticator.accountId, authDescriptor.id),
          mockOperation,
          ftAuth(authenticator.accountId, authDescriptor.id),
          mockOperation,
          ftAuth(authenticator.accountId, authDescriptor.id),
          mockOperation,
        ],
        1,
      ),
      null,
    );
    expect(callback2).toHaveBeenCalledWith(
      anchoredHandlerCallbackParameters(
        client,
        [
          ftAuth(authenticator.accountId, authDescriptor.id),
          mockOperation,
          ftAuth(authenticator.accountId, authDescriptor.id),
          mockOperation,
          ftAuth(authenticator.accountId, authDescriptor.id),
          mockOperation,
        ],
        3,
      ),
      null,
    );
    expect(callback3).toHaveBeenCalledWith(
      anchoredHandlerCallbackParameters(
        client,
        [
          ftAuth(authenticator.accountId, authDescriptor.id),
          mockOperation,
          ftAuth(authenticator.accountId, authDescriptor.id),
          mockOperation,
          ftAuth(authenticator.accountId, authDescriptor.id),
          mockOperation,
        ],
        5,
      ),
      null,
    );
  }, 5000);
});
