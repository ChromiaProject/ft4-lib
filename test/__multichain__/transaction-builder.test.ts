import { Buffer } from "buffer";
import { IClient, createClient } from "postchain-client";
import { nop } from "@ft4/utils";
import { transactionBuilder } from "@ft4/utils/transaction-builder";
import { createTestAuthDescriptor, emptyOp } from "../util/util";
import { FlagsType, createInMemoryFtKeyStore } from "@ft4/index";
import { Authenticator, KeyHandler } from "@ft4/authentication";
import { createFakeAuthDataService } from "../util/fake-auth-data-service";
import { fetchBlockchains } from "./util/blockchain";
import { anchoredHandlerCallbackParameters } from "../util/blockchain-util";

function getMocks() {
  const { authDescriptor, keyPair } = createTestAuthDescriptor([
    FlagsType.Account,
  ]);
  const keyHandlerMock: KeyHandler = {
    authDescriptor,
    keyStore: createInMemoryFtKeyStore(keyPair),
    satisfiesAuthRequirements: jest.fn(),
    authorize: jest
      .fn()
      .mockImplementation((_, operation) => Promise.resolve([operation])),
    sign: jest.fn(),
    getSigners: jest.fn().mockReturnValue([keyPair.pubKey]),
  };
  const authenticatorMock: Authenticator = {
    accountId: Buffer.alloc(32),
    keyHandlers: [keyHandlerMock],
    authDataService: createFakeAuthDataService({}),
    getKeyHandlerForOperation: jest.fn().mockReturnValue(keyHandlerMock),
    getNonce: jest.fn(),
  };
  return {
    authenticatorMock,
    keyHandlerMock,
    keyPair,
    authDescriptor,
  };
}

describe("transaction builder", () => {
  let client: IClient;

  beforeEach(async () => {
    const { multichain00 } = await fetchBlockchains();

    client = await createClient({
      nodeUrlPool: "http://127.0.0.1:7740",
      blockchainRid: multichain00.rid.toString("hex"),
    });
  });

  it("calls registered handler when block is anchored", async () => {
    const { authenticatorMock } = getMocks();
    let callback: jest.Mock<any, any, any> | null = null;
    const operation = nop();

    const promise = new Promise((resolve) => {
      transactionBuilder(authenticatorMock, client)
        .add(
          emptyOp(),
          (callback = jest.fn().mockImplementation((op) => resolve(op))),
        )
        .add(operation)
        .buildAndSend();
    });

    await promise;
    expect(callback).toHaveBeenCalledWith(
      anchoredHandlerCallbackParameters(client, [emptyOp(), operation], 0),
      null,
    );
  });
});
