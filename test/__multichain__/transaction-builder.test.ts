jest.unmock("postchain-client");

import { IClient, createClient } from "postchain-client";
import { nop } from "/ft4/utils";
import { transactionBuilder } from "/ft4/utils/transaction-builder";
import { createTestAuthDescriptor, emptyOp } from "/util/util";
import { FlagsType, createInMemoryFtKeyStore } from "/ft4";
import { Authenticator, KeyHandler } from "/ft4/authentication";
import { createFakeAuthDataService } from "/util/fake-auth-data-service";
import { fetchBlockchains } from "./util/blockchain";

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
    getSigners: jest.fn(),
  };
  const authenticatorMock: Authenticator = {
    accountId: Buffer.alloc(32),
    keyHandlers: [keyHandlerMock],
    authDataService: createFakeAuthDataService({}),
    createSession: jest.fn(),
    getKeyHandlerForOperation: jest.fn().mockReturnValue(keyHandlerMock),
    getNonce: jest.fn(),
  };
  return { authenticatorMock, keyHandlerMock, keyPair, authDescriptor };
}

describe("transaction builder", () => {
  let client: IClient;

  beforeEach(async () => {
    const { multichain00 } = await fetchBlockchains();

    client = await createClient({
      nodeURLPool: "http://127.0.0.1:7740",
      blockchainRID: multichain00.rid.toString("hex"),
    });
  });

  it("calls registered handler when block is anchored", async () => {
    const { authenticatorMock } = getMocks();
    let callback = null;

    const promise = new Promise((resolve) => {
      transactionBuilder(authenticatorMock, client)
        .add(
          emptyOp(),
          (callback = jest.fn().mockImplementation((op) => resolve(op))),
        )
        .add(nop())
        .buildAndSend();
    });

    await promise;
    expect(callback).toHaveBeenCalledWith(emptyOp(), null);
  });
});
