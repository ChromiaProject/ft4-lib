import {
  AccountBuilder,
  createTestAuthDescriptor,
  useChromiaNode,
} from "@ft4-test/util";
import { AuthFlag } from "@ft4/accounts";
import {
  Connection,
  createConnection,
  createKeyStoreInteractor,
} from "@ft4/ft-session";
import { IClient } from "postchain-client";

describe("Main auth descriptor", () => {
  const getClient = useChromiaNode();

  let client: IClient;
  let connection: Connection;

  beforeAll(async () => {
    client = getClient();
    connection = createConnection(client);
  });

  it("can be replaced with new main auth descriptor", async () => {
    const account = await AccountBuilder.account(connection)
      .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
      .build();

    const { keyStore, authDescriptor } = createTestAuthDescriptor();
    const { session } = await account.addAuthDescriptor(
      authDescriptor,
      keyStore,
    );

    const { keyStore: mainKeyStore, authDescriptor: newMainAuthDescriptor } =
      createTestAuthDescriptor();

    const { session: sessionAfterUpdate } =
      await session.account.updateMainAuthDescriptor(
        newMainAuthDescriptor,
        mainKeyStore,
      );

    const authDescriptorsAfterUpdate =
      sessionAfterUpdate.account.authenticator.keyHandlers.map(
        ({ authDescriptor }) => authDescriptor.id,
      );
    const keyStoresAfterUpdate =
      sessionAfterUpdate.account.authenticator.keyHandlers.map(
        ({ keyStore }) => keyStore.id,
      );

    expect(authDescriptorsAfterUpdate).toEqual([
      authDescriptor.id,
      newMainAuthDescriptor.id,
    ]);
    expect(keyStoresAfterUpdate).toEqual([keyStore.id, mainKeyStore.id]);
  });

  it("can initialize session with new main auth descriptor key", async () => {
    const account = await AccountBuilder.account(connection)
      .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
      .build();

    const { keyStore, authDescriptor: newAuthDescriptor } =
      createTestAuthDescriptor();
    await account.updateMainAuthDescriptor(newAuthDescriptor, keyStore);

    const { getSession } = createKeyStoreInteractor(client, keyStore);

    const session = await getSession(account.id);
    expect(session.account.authenticator.keyHandlers.length).toBe(1);
    const keyHandler = session.account.authenticator.keyHandlers[0];
    expect(keyHandler.keyStore).toEqual(keyStore);
    expect(keyHandler.authDescriptor.id).toEqual(newAuthDescriptor.id);
  });

  it("can get main auth descriptor", async () => {
    const account = await AccountBuilder.account(connection)
      .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
      .build();

    const { keyStore, authDescriptor } = createTestAuthDescriptor();
    await account.updateMainAuthDescriptor(authDescriptor, keyStore);

    const mainAuthDescriptor = await account.getMainAuthDescriptor();
    expect(mainAuthDescriptor.id).toEqual(authDescriptor.id);
  });

  it("cannot be deleted with delete_auth_descriptor operation", async () => {
    const account = await AccountBuilder.account(connection)
      .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
      .build();

    const mainAuthDescriptor = await account.getMainAuthDescriptor();

    await expect(
      account.deleteAuthDescriptor(mainAuthDescriptor.id),
    ).rejects.toThrow("Cannot delete main auth descriptor");
  });
});
