import { newSignatureProvider } from "postchain-client";
import { FlagsType } from "/ft4/accounts/auth-descriptor";
import { createInMemoryFtKeyStore } from "/ft4/authentication/ft/key-stores/in-memory";
import {
  KeyStoreInteractor,
  createConnection,
  createKeyStoreInteractor,
} from "/ft4/ft-session";
import AccountBuilder from "./util/account-builder";
import { Connection } from "/ft4/types";
import { createChromiaClient } from "./util/blockchain-util";
import {
  Eip1193Provider,
  createWeb3ProviderEvmKeyStore,
} from "/ft4/authentication";
import { createSingleSignatureAuthDescriptorRegistration } from "/ft4/accounts/auth-descriptor";

let connection: Connection;

describe("Key store interactor", () => {
  beforeAll(async () => {
    connection = createConnection(await createChromiaClient());
  });

  it("should return one account if corresponding key is used in one account", async () => {
    const keyPair1 = newSignatureProvider();
    const keyPair2 = newSignatureProvider();

    await AccountBuilder.account(connection).withParticipant(keyPair1).build();
    await AccountBuilder.account(connection).withParticipant(keyPair2).build();

    const accounts = await createKeyStoreInteractor(
      connection.client,
      createInMemoryFtKeyStore(keyPair1),
    ).getAccounts();

    expect(accounts.length).toEqual(1);
  });

  it("should return two accounts if corresponding key is used in two accounts", async () => {
    const keyPair1 = newSignatureProvider();
    const keyPair2 = newSignatureProvider();

    const account1 = await AccountBuilder.account(connection)
      .withParticipant(keyPair1)
      .build();
    const account2 = await AccountBuilder.account(connection)
      .withParticipant(keyPair2)
      .build();

    await account1.addAuthDescriptor(
      (await account2.getAuthDescriptors()).data[0],
      keyPair2,
    );

    const accounts = await createKeyStoreInteractor(
      connection.client,
      createInMemoryFtKeyStore(keyPair2),
    ).getAccounts();

    expect(accounts.length).toEqual(2);
  });

  it("should have authenticator with one key handler when there is only one auth descriptor with corresponding key", async () => {
    const keyPair1 = newSignatureProvider();

    const account = await AccountBuilder.account(connection)
      .withParticipant(keyPair1)
      .build();

    const { getAccounts, getSession } = createKeyStoreInteractor(
      connection.client,
      createInMemoryFtKeyStore(keyPair1),
    );
    const accounts = await getAccounts();
    expect(accounts.length).toEqual(1);

    const session = await getSession(account.id);
    expect(session.account.authenticator.keyHandlers.length).toEqual(1);
  });

  it("should have authenticator with two key handlers when there are two auth descriptors with corresponding key", async () => {
    const keyPair1 = newSignatureProvider();
    const keyPair2 = newSignatureProvider();

    const account = await AccountBuilder.account(connection)
      .withParticipant(keyPair1)
      .build();

    const ad1 = createSingleSignatureAuthDescriptorRegistration(
      {
        flags: ["M"],
        signer: keyPair1.pubKey,
      },
      null,
    );
    await account.addAuthDescriptor(ad1, keyPair1);

    const ad2 = createSingleSignatureAuthDescriptorRegistration(
      {
        flags: [FlagsType.Transfer],
        signer: keyPair2.pubKey,
      },
      null,
    );
    await account.addAuthDescriptor(ad2, keyPair2);

    const session = await createKeyStoreInteractor(
      connection.client,
      createInMemoryFtKeyStore(keyPair1),
    ).getSession(account.id);

    expect(session.account.authenticator.keyHandlers.length).toEqual(2);
  });

  describe("account updates", () => {
    it("emits a new interactor on account change", async () => {
      let handler: ((...args: any[]) => void) | undefined = undefined;
      const providerMock: Partial<Eip1193Provider> = {
        request: jest
          .fn()
          .mockReturnValueOnce(["0x13376a16794B18CC3287635116BF842e34e9940C"])
          .mockReturnValue(["0xabcfD2cFecb42f72096BA436f091add0fb757104"]),
        once: (eventName: string, h: (...args: any[]) => void) => {
          expect(eventName).toBe("accountsChanged");
          handler = h;
          return {} as Eip1193Provider;
        },
      };
      const keyStore = await createWeb3ProviderEvmKeyStore(
        providerMock as Eip1193Provider,
      );
      const { onKeyStoreChanged } = createKeyStoreInteractor(
        connection.client,
        keyStore,
      );

      const callback = jest.fn();
      const promise = new Promise((resolve) => {
        onKeyStoreChanged((newKeyInteractor: KeyStoreInteractor) => {
          callback();
          resolve(newKeyInteractor);
        });
      });

      handler!();

      await promise;
      expect(callback).toHaveBeenCalled();
    });
  });
});
