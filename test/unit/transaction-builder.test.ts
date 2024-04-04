import { Buffer } from "buffer";

const clusterAnchoringClient = "clusterAnchoringClient";

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
  createTestAuthDescriptorWithSigner,
  emptyOp,
  testAdFromRegistration,
} from "@ft4-test/util";
import {
  AnyAuthDescriptor,
  AuthFlag,
  aggregateSigners,
  createSingleSigAuthDescriptorRegistration,
  transfer,
} from "@ft4/accounts";
import { registerAccountAdminOp } from "@ft4/admin";
import { createAmount } from "@ft4/asset";
import {
  AuthDataService,
  Authenticator,
  FtKeyStore,
  KeyHandler,
  SigningError,
  createAuthenticator,
  evmSigner,
  createEvmKeyHandler,
  createFtKeyHandler,
  createInMemoryEvmKeyStore,
  createInMemoryFtKeyStore,
  createNoopAuthenticator,
  ftAuth,
  ftSigner,
  toRawSignature,
} from "@ft4/authentication";
import {
  AnchoringTimeoutError,
  AuthorizationError,
  EMPTY_SIGNATURE,
  transactionBuilder,
} from "@ft4/transaction-builder";
import {
  IClient,
  KeyPair,
  NetworkSettings,
  Operation,
  gtv,
  SignedTransaction,
  TransactionReceipt,
  Web3PromiEvent,
  createStubClient,
  encryption,
  formatter,
  getBlockAnchoringTransaction,
  gtx,
  isBlockAnchored,
  BlockAnchoringException,
  RawGtx,
} from "postchain-client";
import { nop, op } from "@ft4/utils";
import { ethers } from "ethers";

describe("Transaction Builder", () => {
  let authenticator: Authenticator;
  let client: IClient;
  let keyPair: KeyPair;
  let authDescriptor: AnyAuthDescriptor;
  let keyHandler: KeyHandler;
  let authDataService: AuthDataService;

  const emptyOpAuthMessage = "empty op auth message";

  const mockOperation: Operation = {
    name: "testOperation",
    args: [],
  };

  function setupTestEnvironment(
    exposureLogicFn?: (operationName: string) => Promise<boolean>,
  ) {
    const accountId = encryption.randomBytes(32);

    const { keyPair: pair, authDescriptor: ad } = createTestAuthDescriptor([
      AuthFlag.Transfer,
    ]);
    authDescriptor = ad;
    keyPair = pair;

    keyHandler =
      createInMemoryFtKeyStore(keyPair).createKeyHandler(authDescriptor);

    authDataService = createFakeAuthDataService(
      {
        ["ft4.transfer"]: { flags: [AuthFlag.Transfer], message: "" },
        ["ft4.admin.register_account"]: {
          flags: [AuthFlag.Account],
          message: "",
        },
        ["testOperation"]: { flags: [], message: "" },
      },
      exposureLogicFn,
    );

    authenticator = createAuthenticator(
      accountId,
      [keyHandler],
      authDataService,
    );
  }

  function getMocks() {
    const { authDescriptor, keyPair } = createTestAuthDescriptor([
      AuthFlag.Account,
    ]);

    const keyStoreMock: FtKeyStore = {
      id: keyPair.pubKey,
      pubKey: keyPair.pubKey,
      isInteractive: false,
      sign: jest.fn(),
      createKeyHandler: jest.fn(),
    };

    const keyHandlerMock: KeyHandler = {
      authDescriptor,
      keyStore: keyStoreMock,
      satisfiesAuthRequirements: jest.fn(),
      authorize: jest
        .fn()
        .mockImplementation((_accountId, operation) =>
          Promise.resolve([operation]),
        ),
      sign: keyStoreMock.sign,
      getSigners: jest.fn().mockReturnValue([keyPair.pubKey]),
    };
    const authenticatorMock: Authenticator = {
      accountId: Buffer.alloc(32),
      keyHandlers: [keyHandlerMock],
      authDataService: createFakeAuthDataService({}),
      getKeyHandlerForOperation: jest.fn().mockReturnValue(keyHandlerMock),
      getNonce: jest.fn().mockReturnValue(0),
    };
    return {
      authenticatorMock,
      keyHandlerMock,
      keyStoreMock,
      keyPair,
      authDescriptor,
    };
  }

  beforeEach(async () => {
    setupTestEnvironment();
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
  });

  it("builds and signs a transaction", async () => {
    const args = [Buffer.alloc(32), Buffer.alloc(32), BigInt(10)] as const;
    const tx = gtx.deserialize(
      await transactionBuilder(authenticator, client)
        .add(transfer(args[0], args[1], createAmount(args[2].toString(), 0)))
        .build(),
    );

    expect(tx.blockchainRid).toStrictEqual(
      formatter.toBuffer(client.config.blockchainRid),
    );
    expect(tx.operations).toStrictEqual([
      {
        opName: "ft4.ft_auth",
        args: [authenticator.accountId, authDescriptor.id],
      },
      { opName: "ft4.transfer", args },
    ]);
    expect(tx.signers).toStrictEqual(aggregateSigners(authDescriptor));
    expect(tx.signatures).toBeDefined();
  });

  it("can build transactions with a nop", async () => {
    const operation = nop();
    const tx = gtx.deserialize(
      await transactionBuilder(authenticator, client).add(operation).build(),
    );
    const { name, args } = operation;
    expect(tx.operations).toStrictEqual([{ opName: name, args }]);
  });

  it("does not sign transaction with only a nop on build", async () => {
    const operation = nop();
    const tx = await transactionBuilder(authenticator, client)
      .add(operation)
      .build();
    expect(gtx.deserialize(tx).signers).toStrictEqual([]);
    expect(gtx.deserialize(tx).signatures).toStrictEqual([]);
  });

  it("does not allow build() when there are onAnchoredHandlers", async () => {
    const promise = transactionBuilder(authenticator, client)
      .add(
        transfer(Buffer.alloc(32), Buffer.alloc(32), createAmount(10, 0)),
        (_data, _error) => null,
      )
      .build();
    await expect(promise).rejects.toThrow(Error);
  });

  it("does not allow buildAndSend() when there are onAnchoredHandlers", async () => {
    const promise = transactionBuilder(authenticator, client)
      .add(
        transfer(Buffer.alloc(32), Buffer.alloc(32), createAmount(10, 0)),
        (_data, _error) => null,
      )
      .buildAndSend();
    await expect(promise).rejects.toThrow(Error);
  });

  it("does not allow buildAndSend() when there are onAnchoredHandlers", async () => {
    const promise = transactionBuilder(authenticator, client)
      .add(
        transfer(Buffer.alloc(32), Buffer.alloc(32), createAmount(10, 0)),
        (_data, _error) => null,
      )
      .buildAndSend();
    await expect(promise).rejects.toThrow(Error);
  });

  it("throws an error if not sufficient permissions", async () => {
    const promise = transactionBuilder(authenticator, client)
      .add(registerAccountAdminOp(authDescriptor))
      .build();
    await expect(promise).rejects.toThrow(AuthorizationError);
  });

  it("uses additional signers provided", async () => {
    const operation = nop();
    const tx = await transactionBuilder(authenticator, client)
      .add(operation)
      .addSigners(keyHandler.keyStore as FtKeyStore)
      .build();
    expect(gtx.deserialize(tx).signers).toStrictEqual(keyHandler.getSigners());
    expect(gtx.deserialize(tx).signatures).toBeDefined();
  });

  it("uses custom authenticator if provided", async () => {
    const { authenticatorMock, keyHandlerMock, keyStoreMock, authDescriptor } =
      getMocks();
    await transactionBuilder(authenticator, client)
      .addWithAuthenticator(
        registerAccountAdminOp(authDescriptor),
        authenticatorMock,
      )
      .build();
    expect(keyHandlerMock.authorize).toHaveBeenCalled();
    expect(keyStoreMock.sign).toHaveBeenCalled();
  });

  it("uses uses noop authenticator if authentication is not requested", async () => {
    const args = [Buffer.alloc(32), Buffer.alloc(32), BigInt(10)] as const;
    const tx = gtx.deserialize(
      await transactionBuilder(authenticator, client)
        .addWithoutAuthenticator(
          transfer(args[0], args[1], createAmount(args[2].toString(), 0)),
        )
        .build(),
    );

    expect(tx.operations).toStrictEqual([{ opName: "ft4.transfer", args }]);
  });

  it("throws an error when the operation does not exist", async () => {
    setupTestEnvironment(() => Promise.resolve(false));

    const builder = transactionBuilder(authenticator, client);
    builder.add(mockOperation);

    await expect(builder.build()).rejects.toThrow(
      `Operation ${mockOperation.name} does not exist`,
    );
  });

  it("does not throw an error when the operation exists", async () => {
    setupTestEnvironment((operationName) =>
      Promise.resolve(operationName === mockOperation.name),
    );

    const builder = transactionBuilder(authenticator, client);
    builder.add(mockOperation);

    await expect(builder.build()).resolves.not.toThrow();
  });

  it("builds correct transaction", async () => {
    setupTestEnvironment((operationName) =>
      Promise.resolve(operationName === mockOperation.name),
    );

    const expectedTx = await gtx.sign(
      {
        blockchainRid: formatter.ensureBuffer(client.config.blockchainRid),
        operations: [
          {
            opName: "ft4.ft_auth",
            args: [authenticator.accountId, authDescriptor.id],
          },
          { opName: mockOperation.name, args: [] },
        ],
        signers: [keyPair.pubKey!],
      },
      keyPair.privKey,
      keyPair.pubKey,
    );

    const tx = await transactionBuilder(authenticator, client)
      .add(mockOperation)
      .build();

    expect(gtx.deserialize(tx)).toEqual(expectedTx);
  });

  it("can bypass authentication", async () => {
    const args = [Buffer.alloc(32), Buffer.alloc(32), BigInt(10)] as const;
    const tx = gtx.deserialize(
      await transactionBuilder(authenticator, client)
        .addWithAuthenticator(
          transfer(args[0], args[1], createAmount(args[2].toString(), 0)),
          createNoopAuthenticator(createFakeAuthDataService({})),
        )
        .build(),
    );

    expect(tx.operations).toStrictEqual([{ opName: "ft4.transfer", args }]);
  });

  it("can build and submit a transaction, and emits 'built' event while doing so", async () => {
    const { authenticatorMock, keyPair } = getMocks();
    const operation = nop();
    const expectedTx = gtx.serialize({
      blockchainRid: formatter.ensureBuffer(client.config.blockchainRid),
      operations: [
        { opName: emptyOp().name, args: [] },
        { opName: operation.name, args: operation.args! },
      ],
      signers: [keyPair.pubKey],
    });

    let builtEvent: SignedTransaction | undefined = undefined;
    const { tx } = await transactionBuilder(authenticatorMock, client)
      .add(emptyOp())
      .add(operation)
      .buildAndSend()
      .on("built", (tx) => {
        builtEvent = tx;
      });

    expect(gtx.deserialize(tx)).toMatchObject({
      ...gtx.deserialize(expectedTx),
      signatures: expect.arrayContaining([]),
    });

    expect(builtEvent!.equals(tx));
  }, 5000);

  it("throw SigningError if user rejects FT signature", async () => {
    const accountId = encryption.randomBytes(32);
    const keyPair = encryption.makeKeyPair();
    let keyStore = createInMemoryFtKeyStore(keyPair);
    const ad = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Transfer],
      keyStore.pubKey,
      null,
    );

    // Rewire the keystore to let us fake signing failure
    const sign = jest.fn().mockImplementation(() => {
      throw new Error("signing failed");
    });
    keyStore = { ...keyStore, sign };

    const authService = createFakeAuthDataService({
      foo: { flags: ["T"], message: "bogus" },
    });
    const authenticator = createAuthenticator(
      accountId,
      [createFtKeyHandler(testAdFromRegistration(ad), keyStore)],
      authService,
    );

    await expect(
      transactionBuilder(authenticator, client).add(op("foo")).build(),
    ).rejects.toThrow(SigningError);
  });

  it("throw SigningError if user rejects EVM signature", async () => {
    const accountId = encryption.randomBytes(32);
    const keyPair = encryption.makeKeyPair();
    const message = "Sign this message with {nonce}";
    let keyStore = createInMemoryEvmKeyStore(keyPair);
    const ad = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Transfer],
      keyStore.address,
      null,
    );

    // Rewire the keystore to let us fake a user rejection
    const signMessage = jest.fn().mockImplementation(() => {
      const err = new Error() as ethers.ActionRejectedError;
      err.code = "ACTION_REJECTED";
      err.reason = "rejected";
      err.message = "signing rejected";
      err.shortMessage = "signing rejected";
      throw err;
    });
    keyStore = { ...keyStore, signMessage };

    const authService = createFakeAuthDataService({
      foo: { flags: ["T"], message },
    });
    const authenticator = createAuthenticator(
      accountId,
      [createEvmKeyHandler(testAdFromRegistration(ad), keyStore)],
      authService,
    );

    await expect(
      transactionBuilder(authenticator, client).add(op("foo")).build(),
    ).rejects.toThrow(SigningError);
  });

  describe("block anchored handling", () => {
    it("calls registered handler when block is anchored in system anchoring chain", async () => {
      (getBlockAnchoringTransaction as jest.Mock).mockResolvedValueOnce({
        txRid: formatter.toBuffer("CA"),
      });
      (isBlockAnchored as jest.Mock).mockResolvedValueOnce(true);
      const operation = nop();
      const callback: jest.Mock = jest.fn();
      let signedEvent: SignedTransaction | undefined = undefined;
      let confirmedEvent: TransactionReceipt | undefined = undefined;
      const { tx, receipt } = await transactionBuilder(authenticator, client, {
        retryCount: 10,
        waitTimeMs: 10,
      })
        .add(mockOperation, callback)
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
      await transactionBuilder(authenticator, client, {
        retryCount: 10,
        waitTimeMs: 10,
      })
        .add(mockOperation, callback)
        .add(mockOperation, callback2)
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
      await transactionBuilder(authenticator, client, {
        retryCount: 10,
        waitTimeMs: 10,
      })
        .add(mockOperation, callback)
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
      await transactionBuilder(authenticator, client, {
        retryCount: 10,
        waitTimeMs: 10,
      })
        .add(mockOperation, callback)
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

    it("calls callback with an error and reject the promise if polling for cluster anchoring times out", async () => {
      (getBlockAnchoringTransaction as jest.Mock)
        .mockRejectedValue(new BlockAnchoringException())
        .mockRejectedValue(new BlockAnchoringException());

      const callback: jest.Mock = jest.fn();
      const promise = transactionBuilder(authenticator, client, {
        retryCount: 2,
        waitTimeMs: 1,
      })
        .add(mockOperation, callback)
        .add(nop())
        .buildAndSendWithAnchoring();

      await expect(promise).rejects.toThrow(AnchoringTimeoutError);

      expect(callback).toHaveBeenCalledWith(
        null,
        expect.any(AnchoringTimeoutError),
      );
    }, 5000);

    it("calls callback with an error and reject the promise if polling for system anchoring times out", async () => {
      (getBlockAnchoringTransaction as jest.Mock).mockResolvedValueOnce({
        txRid: formatter.toBuffer("CA"),
      });
      (isBlockAnchored as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const callback: jest.Mock = jest.fn();
      const promise = transactionBuilder(authenticator, client, {
        retryCount: 2,
        waitTimeMs: 1,
      })
        .add(mockOperation, callback)
        .add(nop())
        .buildAndSendWithAnchoring();

      await expect(promise).rejects.toThrow(AnchoringTimeoutError);

      expect(callback).toHaveBeenCalledWith(
        null,
        expect.any(AnchoringTimeoutError),
      );
    }, 5000);

    it("adds signer and signature when FtKeyStore provided as a signer", async () => {
      const blockchainRid = Buffer.alloc(32);
      const ftKeyStore = createInMemoryFtKeyStore(encryption.makeKeyPair());

      const tx = await transactionBuilder(
        createNoopAuthenticator(createFakeAuthDataService({})),
        client,
      )
        .addWithSignersOnly(emptyOp(), [ftKeyStore])
        .build();

      const expectedTxWithoutSignatures: RawGtx = [
        [blockchainRid, [["empty_op", []]], [ftKeyStore.id]],
        [],
      ];

      expect(tx).toEqual(
        gtv.encode([
          expectedTxWithoutSignatures[0],
          [await ftKeyStore.sign(expectedTxWithoutSignatures)],
        ]),
      );
    });

    it("adds signer without signature when FtSigner provided as a signer", async () => {
      const blockchainRid = Buffer.alloc(32);
      const signer = ftSigner(encryption.makeKeyPair().pubKey);

      const tx = await transactionBuilder(
        createNoopAuthenticator(createFakeAuthDataService({})),
        client,
      )
        .addWithSignersOnly(emptyOp(), [signer])
        .build();

      const expectedTx = gtv.encode([
        [blockchainRid, [["empty_op", []]], [signer.pubKey]],
        [EMPTY_SIGNATURE],
      ]);

      expect(tx).toEqual(expectedTx);
    });

    it("adds signers and signatures when FtSigners and FtKeyStores provided as signers", async () => {
      const blockchainRid = Buffer.alloc(32);
      const ftKeyStore1 = createInMemoryFtKeyStore(encryption.makeKeyPair());
      const signer2 = ftSigner(encryption.makeKeyPair().pubKey);
      const ftKeyStore3 = createInMemoryFtKeyStore(encryption.makeKeyPair());
      const signer4 = ftSigner(encryption.makeKeyPair().pubKey);

      const tx = await transactionBuilder(
        createNoopAuthenticator(createFakeAuthDataService({})),
        client,
      )
        .addWithSignersOnly(emptyOp(), [
          ftKeyStore1,
          signer2,
          ftKeyStore3,
          signer4,
        ])
        .build();

      const expectedTxWithoutSignatures: RawGtx = [
        [
          blockchainRid,
          [["empty_op", []]],
          [ftKeyStore1.id, signer2.pubKey, ftKeyStore3.id, signer4.pubKey],
        ],
        [],
      ];

      expect(tx).toEqual(
        gtv.encode([
          expectedTxWithoutSignatures[0],
          [
            await ftKeyStore1.sign(expectedTxWithoutSignatures),
            EMPTY_SIGNATURE,
            await ftKeyStore3.sign(expectedTxWithoutSignatures),
            EMPTY_SIGNATURE,
          ],
        ]),
      );
    });

    it("adds signer and signature when EvmKeyStore provided as a signer", async () => {
      const blockchainRid = Buffer.alloc(32);
      const evmKeyStore = createInMemoryEvmKeyStore(encryption.makeKeyPair());

      const authenticator = createNoopAuthenticator(
        createFakeAuthDataService({
          empty_op: { flags: [], message: emptyOpAuthMessage },
        }),
      );
      const tx = await transactionBuilder(authenticator, client)
        .addWithSignersOnly(emptyOp(), [evmKeyStore])
        .build();

      const expectedTx = gtv.encode([
        [
          blockchainRid,
          [
            [
              "ft4.evm_signatures",
              [
                [evmKeyStore.id],
                [
                  toRawSignature(
                    await evmKeyStore.signMessage(emptyOpAuthMessage),
                  ),
                ],
              ],
            ],
            ["empty_op", []],
          ],
          [],
        ],
        [],
      ]);

      expect(tx).toEqual(expectedTx);
    });

    it("adds signer without signature when EvmSigner provided as a signer", async () => {
      const blockchainRid = Buffer.alloc(32);
      const evmKeyStore = createInMemoryEvmKeyStore(encryption.makeKeyPair());
      const signer = evmSigner(evmKeyStore.address);

      const authenticator = createNoopAuthenticator(
        createFakeAuthDataService({
          empty_op: { flags: [], message: emptyOpAuthMessage },
        }),
      );
      const tx = await transactionBuilder(authenticator, client)
        .addWithSignersOnly(emptyOp(), [signer])
        .build();

      const expectedTx = gtv.encode([
        [
          blockchainRid,
          [
            ["ft4.evm_signatures", [[signer.address], [null]]],
            ["empty_op", []],
          ],
          [],
        ],
        [],
      ]);

      expect(tx).toEqual(expectedTx);
    });

    it("adds signers and signatures when EvmSigners and EvmKeyStores provided as signers", async () => {
      const blockchainRid = Buffer.alloc(32);
      const evmKeyStore1 = createInMemoryEvmKeyStore(encryption.makeKeyPair());
      const evmKeyStore2 = createInMemoryEvmKeyStore(encryption.makeKeyPair());
      const evmKeyStore3 = createInMemoryEvmKeyStore(encryption.makeKeyPair());
      const evmKeyStore4 = createInMemoryEvmKeyStore(encryption.makeKeyPair());
      const signer2 = evmSigner(evmKeyStore2.id);
      const signer4 = evmSigner(evmKeyStore4.id);

      const authenticator = createNoopAuthenticator(
        createFakeAuthDataService({
          empty_op: { flags: [], message: emptyOpAuthMessage },
        }),
      );
      const tx = await transactionBuilder(authenticator, client)
        .addWithSignersOnly(emptyOp(), [
          evmKeyStore1,
          signer2,
          evmKeyStore3,
          signer4,
        ])
        .build();

      const expectedTx = gtv.encode([
        [
          blockchainRid,
          [
            [
              "ft4.evm_signatures",
              [
                [
                  evmKeyStore1.id,
                  signer2.address,
                  evmKeyStore3.id,
                  signer4.address,
                ],
                [
                  toRawSignature(
                    await evmKeyStore1.signMessage(emptyOpAuthMessage),
                  ),
                  null,
                  toRawSignature(
                    await evmKeyStore3.signMessage(emptyOpAuthMessage),
                  ),
                  null,
                ],
              ],
            ],
            ["empty_op", []],
          ],
          [],
        ],
        [],
      ]);

      expect(tx).toEqual(expectedTx);
    });

    it("adds signers and signatures when EvmKeyStore, EvmSigner, FtKeyStore and FtSigner provided as signers", async () => {
      const blockchainRid = Buffer.alloc(32);
      const evmKeyStore1 = createInMemoryEvmKeyStore(encryption.makeKeyPair());
      const evmKeyStore2 = createInMemoryEvmKeyStore(encryption.makeKeyPair());
      const ftKeyStore3 = createInMemoryFtKeyStore(encryption.makeKeyPair());
      const ftSigner4 = ftSigner(encryption.makeKeyPair().pubKey);
      const evmSigner2 = evmSigner(evmKeyStore2.id);

      const authenticator = createNoopAuthenticator(
        createFakeAuthDataService({
          empty_op: { flags: [], message: emptyOpAuthMessage },
        }),
      );
      const tx = await transactionBuilder(authenticator, client)
        .addWithSignersOnly(emptyOp(), [
          evmKeyStore1,
          evmSigner2,
          ftKeyStore3,
          ftSigner4,
        ])
        .build();

      const expectedTxWithoutSignatures: RawGtx = [
        [
          blockchainRid,
          [
            [
              "ft4.evm_signatures",
              [
                [evmKeyStore1.id, evmSigner2.address],
                [
                  toRawSignature(
                    await evmKeyStore1.signMessage(emptyOpAuthMessage),
                  ),
                  null,
                ],
              ],
            ],
            ["empty_op", []],
          ],
          [ftKeyStore3.id, ftSigner4.pubKey],
        ],
        [],
      ];

      expect(tx).toEqual(
        gtv.encode([
          expectedTxWithoutSignatures[0],
          [
            await ftKeyStore3.sign(expectedTxWithoutSignatures),
            EMPTY_SIGNATURE,
          ],
        ]),
      );
    });

    it("can combine evm_signatures operation with ft_auth operation", async () => {
      const blockchainRid = Buffer.alloc(32);
      const evmKeyStore = createInMemoryEvmKeyStore(encryption.makeKeyPair());
      const accountId = encryption.randomBytes(32);
      const { keyStore, authDescriptor } = createTestAuthDescriptor();
      const authenticator = createAuthenticator(
        accountId,
        [keyStore.createKeyHandler(authDescriptor)],
        createFakeAuthDataService({
          empty_op: { flags: [], message: emptyOpAuthMessage },
        }),
      );

      const tx = await transactionBuilder(authenticator, client)
        .addWithSigner(emptyOp(), [evmKeyStore])
        .build();

      const expectedTxWithoutSignatures: RawGtx = [
        [
          blockchainRid,
          [
            [
              "ft4.evm_signatures",
              [
                [evmKeyStore.address],
                [
                  toRawSignature(
                    await evmKeyStore.signMessage(emptyOpAuthMessage),
                  ),
                ],
              ],
            ],
            ["ft4.ft_auth", [accountId, authDescriptor.id]],
            ["empty_op", []],
          ],
          [keyStore.id],
        ],
        [],
      ];

      expect(tx).toEqual(
        gtv.encode([
          expectedTxWithoutSignatures[0],
          [await keyStore.sign(expectedTxWithoutSignatures)],
        ]),
      );
    });

    it("can combine evm_signatures operation with evm_auth operation", async () => {
      const blockchainRid = Buffer.alloc(32);
      const evmKeyStore1 = createInMemoryEvmKeyStore(encryption.makeKeyPair());
      const evmKeyStore2 = createInMemoryEvmKeyStore(encryption.makeKeyPair());

      const accountId = gtv.gtvHash(evmKeyStore1.id);
      const authDescriptor = createTestAuthDescriptorWithSigner(
        accountId,
        evmKeyStore1.id,
      );
      const authenticator = createAuthenticator(
        accountId,
        [evmKeyStore1.createKeyHandler(authDescriptor)],
        createFakeAuthDataService({
          empty_op: { flags: [], message: emptyOpAuthMessage },
        }),
      );

      const tx = await transactionBuilder(authenticator, client)
        .addWithSigner(emptyOp(), [evmKeyStore2])
        .build();

      const expectedTx = gtv.encode([
        [
          blockchainRid,
          [
            [
              "ft4.evm_signatures",
              [
                [evmKeyStore2.address],
                [
                  toRawSignature(
                    await evmKeyStore2.signMessage(emptyOpAuthMessage),
                  ),
                ],
              ],
            ],
            [
              "ft4.evm_auth",
              [
                accountId,
                authDescriptor.id,
                [
                  toRawSignature(
                    await evmKeyStore1.signMessage(emptyOpAuthMessage),
                  ),
                ],
              ],
            ],
            ["empty_op", []],
          ],
          [],
        ],
        [],
      ]);

      expect(tx).toEqual(expectedTx);
    });

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
      await transactionBuilder(authenticator, client, {
        retryCount: 10,
        waitTimeMs: 10,
      })
        .addWithAnchoring(mockOperation, targetBlockchainRid1, callback1)
        .addWithAnchoring(mockOperation, targetBlockchainRid2, callback2)
        .addWithAnchoring(mockOperation, targetBlockchainRid2, callback3)
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
});
