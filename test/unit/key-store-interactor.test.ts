import { createConnection, createKeyStoreInteractor } from "@ft4/ft-session";
import { Connection, KeyStoreInteractor } from "@ft4/types";
import {
  Eip1193Provider,
  createWeb3ProviderEvmKeyStore,
} from "@ft4/authentication";
import { createStubClient } from "postchain-client";

let connection: Connection;

describe("Key store interactor", () => {
  beforeAll(async () => {
    connection = createConnection(await createStubClient());
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

      handler!("0x0000000000000000000000000000000000000000");

      await promise;
      expect(callback).toHaveBeenCalled();
    });
  });
});
