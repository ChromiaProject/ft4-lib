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
import { AnyAuthDescriptor, AuthFlag } from "@ft4/accounts";
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

  it("resolves even if block is not cluster anchored immediately", async () => {
    (getBlockAnchoringTransaction as jest.Mock)
      .mockRejectedValue(new BlockAnchoringException())
      .mockResolvedValueOnce({ txRid: formatter.toBuffer("CA") });
    (isBlockAnchored as jest.Mock).mockResolvedValueOnce(true);

    const operation = nop();
    const data = await transactionBuilder(authenticator, client)
      .add(mockOperation)
      .add(operation)
      .buildAndSendWithAnchoring();

    expect(data).toMatchObject(
      anchoredHandlerCallbackParameters(client, [
        ftAuth(authenticator.accountId, authDescriptor.id),
        mockOperation,
        operation,
      ]),
    );
  }, 5000);

  it("resolves even if block is not system anchored immediately", async () => {
    (getBlockAnchoringTransaction as jest.Mock).mockResolvedValueOnce({
      txRid: formatter.toBuffer("CA"),
    });
    (isBlockAnchored as jest.Mock)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const operation = nop();
    const data = await transactionBuilder(authenticator, client)
      .add(mockOperation)
      .add(operation)
      .buildAndSendWithAnchoring();

    expect(data).toMatchObject(
      anchoredHandlerCallbackParameters(client, [
        ftAuth(authenticator.accountId, authDescriptor.id),
        mockOperation,
        operation,
      ]),
    );
  }, 5000);
});
