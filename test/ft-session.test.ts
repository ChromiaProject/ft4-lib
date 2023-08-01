import {
  callWithoutNop,
  resetExposedOperations,
} from "../client/lib/ft4/ft-session";
import { Authenticator } from "../client/lib/ft4/authentication/types";
import {
  IClient,
  Operation,
  ResponseStatus,
  TransactionReceipt,
} from "postchain-client";
import { Connection } from "../client/lib/ft4/types";

// Mock the connection object
const mockConnection: Partial<Connection> = {
  query: jest.fn(),
  client: {
    config: {
      blockchainRID: "mockBlockchainRID",
    },
    sendTransaction: jest.fn(),
  } as unknown as IClient,
};

// Mock the authenticator
const mockAuthenticator: Partial<Authenticator> = {
  getKeyHandlerForOperation: jest.fn().mockResolvedValue({
    sign: jest.fn(),
    authDescriptor: {
      id: "mockId",
    },
    authorize: jest.fn().mockResolvedValue([]),
    getSigners: jest.fn(),
  }),
  getNonce: jest.fn().mockResolvedValue(1),
};

// Mock the operation
const mockOperation: Operation = {
  name: "testOperation",
};

describe("ft-session.ts", () => {
  afterEach(() => {
    jest.clearAllMocks();
    resetExposedOperations();
  });

  test("callWithoutNop should throw an error if the operation does not exist", async () => {
    (mockConnection.query as jest.Mock).mockResolvedValueOnce({
      modules: [],
    });

    await expect(
      callWithoutNop(
        mockConnection as Connection,
        mockAuthenticator as Authenticator,
        mockOperation,
      ),
    ).rejects.toThrow(`Operation ${mockOperation.name} does not exist`);
  });

  test("callWithoutNop should send a transaction if the operation exists", async () => {
    const mockTransactionReceipt: TransactionReceipt = {
      status: ResponseStatus.Confirmed,
      statusCode: 200,
      transactionRID: Buffer.from("testRID"),
    };

    (mockConnection.query as jest.Mock).mockResolvedValueOnce({
      modules: [
        {
          operations: {
            testOperation: {},
          },
        },
      ],
    });

    (mockConnection.client.sendTransaction as jest.Mock).mockResolvedValueOnce(
      mockTransactionReceipt,
    );

    const result = await callWithoutNop(
      mockConnection as Connection,
      mockAuthenticator as Authenticator,
      mockOperation,
    );

    expect(result).toBe(mockTransactionReceipt);
  });
});
