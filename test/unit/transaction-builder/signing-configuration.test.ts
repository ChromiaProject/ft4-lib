import {
  createFakeAuthDataService,
  createTestAuthDescriptor,
  createTestAuthDescriptorWithSigner,
  emptyOp,
} from "@ft4-test/util";
import {
  createAuthenticator,
  createInMemoryEvmKeyStore,
  createInMemoryFtKeyStore,
  createNoopAuthenticator,
  evmSigner,
  ftSigner,
  noopAuthenticator,
  toRawSignature,
} from "@ft4/authentication";
import { EMPTY_SIGNATURE, transactionBuilder } from "@ft4/transaction-builder";
import { deriveNonce } from "@ft4/utils";
import {
  IClient,
  RawGtx,
  createStubClient,
  encryption,
  formatter,
  gtv,
  gtx,
} from "postchain-client";

const emptyOpAuthMessage = "empty op auth message";
let client: IClient;

beforeAll(async () => {
  client = await createStubClient();
});

describe("Transaction builder signing", () => {
  it("adds signer without signature when FtSigner provided as a signer", async () => {
    const blockchainRid = Buffer.alloc(32);
    const signer = ftSigner(encryption.makeKeyPair().pubKey);

    const tx = await transactionBuilder(noopAuthenticator, client)
      .add(emptyOp(), { signers: [signer] })
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

    const tx = await transactionBuilder(noopAuthenticator, client)
      .add(emptyOp(), {
        signers: [ftKeyStore1, signer2, ftKeyStore3, signer4],
        authenticator: noopAuthenticator,
      })
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

  it("adds signer and signature when FtKeyStore provided as a signer", async () => {
    const blockchainRid = Buffer.alloc(32);
    const ftKeyStore = createInMemoryFtKeyStore(encryption.makeKeyPair());

    const tx = await transactionBuilder(noopAuthenticator, client)
      .add(emptyOp(), {
        signers: [ftKeyStore],
        authenticator: noopAuthenticator,
      })
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

  it("adds signer and signature when EvmKeyStore provided as a signer", async () => {
    const blockchainRid = Buffer.alloc(32);
    const evmKeyStore = createInMemoryEvmKeyStore(encryption.makeKeyPair());

    const authenticator = createNoopAuthenticator(
      createFakeAuthDataService({
        empty_op: { flags: [], message: emptyOpAuthMessage },
      }),
    );
    const tx = await transactionBuilder(authenticator, client)
      .add(emptyOp(), { signers: [evmKeyStore] })
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
      .add(emptyOp(), { signers: [signer], authenticator: noopAuthenticator })
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
      .add(emptyOp(), {
        signers: [evmKeyStore1, signer2, evmKeyStore3, signer4],
      })
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
      .add(emptyOp(), {
        signers: [evmKeyStore1, evmSigner2, ftKeyStore3, ftSigner4],
      })
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
        [await ftKeyStore3.sign(expectedTxWithoutSignatures), EMPTY_SIGNATURE],
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
      .add(emptyOp(), { signers: [evmKeyStore] })
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

  it("can combine evm_signatures operation with ft_auth operation without signing", async () => {
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
      .add(emptyOp(), { signers: [evmKeyStore], skipFtSigning: true })
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
      gtv.encode([expectedTxWithoutSignatures[0], [EMPTY_SIGNATURE]]),
    );
  });

  it("skips ft signing only on the specified operations", async () => {
    const ftKeyStore1 = createInMemoryFtKeyStore(encryption.makeKeyPair());
    const { keyStore: ftKeyStore2, authDescriptor: authDescriptor2 } =
      createTestAuthDescriptor();
    const accountId = encryption.randomBytes(32);
    const { keyStore: keyStore3, authDescriptor: authDescriptor3 } =
      createTestAuthDescriptor();
    const authenticator = createAuthenticator(
      accountId,
      [keyStore3.createKeyHandler(authDescriptor3)],
      createFakeAuthDataService({
        empty_op: { flags: [], message: emptyOpAuthMessage },
      }),
    );
    const authenticator2 = createAuthenticator(
      accountId,
      [ftKeyStore2.createKeyHandler(authDescriptor2)],
      createFakeAuthDataService({
        empty_op: { flags: [], message: emptyOpAuthMessage },
      }),
    );

    const tx = await transactionBuilder(authenticator, client)
      .add(emptyOp(), { signers: [ftKeyStore1], skipFtSigning: true })
      .add(emptyOp(), { authenticator: authenticator2 })
      .add(emptyOp())
      .build();

    const deserializedTx = gtx.deserialize(tx);
    expect(deserializedTx.signatures![0].equals(EMPTY_SIGNATURE)).toBe(false); // Signed by keyStore
    expect(deserializedTx.signatures![1].equals(EMPTY_SIGNATURE)).toBe(true); // Not signed by ftKeyStore1
    expect(deserializedTx.signatures![2].equals(EMPTY_SIGNATURE)).toBe(false); // Signed by ftKeyStore2
  });

  it("skips ft signing on all the specified operations", async () => {
    const ftKeyStore1 = createInMemoryFtKeyStore(encryption.makeKeyPair());
    const ftKeyStore2 = createInMemoryFtKeyStore(encryption.makeKeyPair());
    const accountId = encryption.randomBytes(32);
    const { keyStore, authDescriptor } = createTestAuthDescriptor();
    const authenticator = createAuthenticator(
      accountId,
      [keyStore.createKeyHandler(authDescriptor)],
      createFakeAuthDataService({
        empty_op: { flags: [], message: emptyOpAuthMessage },
      }),
    );
    const authenticator2 = createAuthenticator(
      accountId,
      [ftKeyStore2.createKeyHandler(authDescriptor)],
      createFakeAuthDataService({
        empty_op: { flags: [], message: emptyOpAuthMessage },
      }),
    );

    const tx = await transactionBuilder(authenticator, client)
      .add(emptyOp(), { signers: [ftKeyStore1], skipFtSigning: true })
      .add(emptyOp(), {
        signers: [ftKeyStore2],
        authenticator: authenticator2,
        skipFtSigning: true,
      })
      .add(emptyOp(), { skipFtSigning: true })
      .build();

    const deserializedTx = gtx.deserialize(tx);
    expect(deserializedTx.signatures![0].equals(EMPTY_SIGNATURE)).toBe(true);
    expect(deserializedTx.signatures![1].equals(EMPTY_SIGNATURE)).toBe(true);
    expect(deserializedTx.signatures![2].equals(EMPTY_SIGNATURE)).toBe(true);
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
      .add(emptyOp(), { signers: [evmKeyStore2] })
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

  it("throws error if account_id placeholder exists in auth message template but there is not auth operation", async () => {
    const authMessageTemplate = "auth message with {account_id}";
    const accountId = encryption.randomBytes(32);
    const evmKeyStore = createInMemoryEvmKeyStore(encryption.makeKeyPair());

    const authDataService = createFakeAuthDataService({
      empty_op: { flags: [], message: authMessageTemplate },
    });
    const authenticator = createAuthenticator(accountId, [], authDataService);

    const promise = transactionBuilder(authenticator, client)
      .add(emptyOp(), {
        authenticator: createNoopAuthenticator(authDataService),
        signers: [evmKeyStore],
      })
      .build();

    await expect(promise).rejects.toThrow("Unable to sign operation empty_op");
  });

  it("throws error if auth_descriptor_id placeholder exists in auth message template but there is not auth operation", async () => {
    const authMessageTemplate = "auth message with {auth_descriptor_id}";
    const accountId = encryption.randomBytes(32);
    const evmKeyStore = createInMemoryEvmKeyStore(encryption.makeKeyPair());

    const authDataService = createFakeAuthDataService({
      empty_op: { flags: [], message: authMessageTemplate },
    });
    const authenticator = createAuthenticator(accountId, [], authDataService);

    const promise = transactionBuilder(authenticator, client)
      .add(emptyOp(), {
        authenticator: createNoopAuthenticator(authDataService),
        signers: [evmKeyStore],
      })
      .build();

    await expect(promise).rejects.toThrow("Unable to sign operation empty_op");
  });

  it("adds evm_signatures when account_id and auth_descriptor_id placeholders exist in auth message template and there is ft auth operation", async () => {
    const authMessageTemplate =
      "auth message with {account_id} {auth_descriptor_id}";
    const accountId = encryption.randomBytes(32);
    const blockchainRid = Buffer.alloc(32);
    const evmKeyStore = createInMemoryEvmKeyStore(encryption.makeKeyPair());
    const { keyStore, authDescriptor } = createTestAuthDescriptor();

    const authDataService = createFakeAuthDataService({
      empty_op: { flags: [], message: authMessageTemplate },
    });
    const authenticator = createAuthenticator(
      accountId,
      [keyStore.createKeyHandler(authDescriptor)],
      authDataService,
    );

    const tx = await transactionBuilder(authenticator, client)
      .add(emptyOp(), { signers: [evmKeyStore] })
      .build();

    const message = `auth message with ${formatter.toString(accountId)} ${formatter.toString(authDescriptor.id)}`;

    const expectedTxWithoutSignatures: RawGtx = [
      [
        blockchainRid,
        [
          [
            "ft4.evm_signatures",
            [
              [evmKeyStore.id],
              [toRawSignature(await evmKeyStore.signMessage(message))],
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

  it("adds evm_signatures when account_id and auth_descriptor_id placeholders exist in auth message template and there is evm auth operation", async () => {
    const authMessageTemplate =
      "auth message with {account_id} {auth_descriptor_id}";
    const accountId = encryption.randomBytes(32);
    const blockchainRid = Buffer.alloc(32);
    const evmKeyStore1 = createInMemoryEvmKeyStore(encryption.makeKeyPair());
    const evmKeyStore2 = createInMemoryEvmKeyStore(encryption.makeKeyPair());
    const authDescriptor = createTestAuthDescriptorWithSigner(
      accountId,
      evmKeyStore1.id,
    );

    const authDataService = createFakeAuthDataService({
      empty_op: { flags: [], message: authMessageTemplate },
    });
    const authenticator = createAuthenticator(
      accountId,
      [evmKeyStore1.createKeyHandler(authDescriptor)],
      authDataService,
    );

    const tx = await transactionBuilder(authenticator, client)
      .add(emptyOp(), { signers: [evmKeyStore2] })
      .build();

    const message = `auth message with ${formatter.toString(accountId)} ${formatter.toString(authDescriptor.id)}`;

    const expectedTx = gtv.encode([
      [
        blockchainRid,
        [
          [
            "ft4.evm_signatures",
            [
              [evmKeyStore2.id],
              [toRawSignature(await evmKeyStore2.signMessage(message))],
            ],
          ],
          [
            "ft4.evm_auth",
            [
              accountId,
              authDescriptor.id,
              [toRawSignature(await evmKeyStore1.signMessage(message))],
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

  it("adds evm_signatures when nonce and blockchain_rid exist in auth message template but there is not auth operation", async () => {
    const authMessageTemplate = "auth message with {blockchain_rid} {nonce}";
    const blockchainRid = Buffer.alloc(32);
    const accountId = encryption.randomBytes(32);
    const evmKeyStore = createInMemoryEvmKeyStore(encryption.makeKeyPair());

    const authDataService = createFakeAuthDataService({
      empty_op: { flags: [], message: authMessageTemplate },
    });
    const authenticator = createAuthenticator(accountId, [], authDataService);

    const tx = await transactionBuilder(authenticator, client)
      .add(emptyOp(), {
        authenticator: createNoopAuthenticator(authDataService),
        signers: [evmKeyStore],
      })
      .build();

    const message = `auth message with ${formatter.toString(blockchainRid)} ${deriveNonce(blockchainRid, emptyOp(), 0)}`;

    const expectedTx = gtv.encode([
      [
        blockchainRid,
        [
          [
            "ft4.evm_signatures",
            [
              [evmKeyStore.id],
              [toRawSignature(await evmKeyStore.signMessage(message))],
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
});
