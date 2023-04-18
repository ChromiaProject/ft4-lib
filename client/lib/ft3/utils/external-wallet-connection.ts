import WalletConnect from "@walletconnect/client";
import { ConnectionCallbackParams, ExternalWalletConnection } from "./types";

const BRIDGE_URL = "https://bridge.walletconnect.org";

export async function createBasicConnection(): Promise<WalletConnect> {
  const connector = new WalletConnect({
    bridge: BRIDGE_URL,
  });

  await connector.createSession();
  return connector;
}

export const createExternalWalletConnection = async (
  connector?: WalletConnect
): Promise<ExternalWalletConnection> => {
  let _accounts: string[] = [];
  let _connector = connector || (await createBasicConnection());

  await new Promise((resolve) => {
    _connector.on("connect", resolve);
  });
  _connector.on("session_update", updateSession);
  _connector.on("disconnect", disconnectSession);

  function updateSession(error: Error, params: ConnectionCallbackParams) {
    if (error) {
      throw error;
    }
    _accounts = params.accounts;
  }

  function disconnectSession() {
    _connector = undefined;
  }

  return Object.freeze({
    connectionUri: _connector.uri,
    getAccounts: () => [..._accounts],
    signMessage: async ({
      message,
      account,
    }: {
      message: string;
      account: string;
    }): Promise<string> => {
      const msgParams = [message, account];
      if (!_connector)
        throw new Error("Connector is undefined. Did you disconnect?");
      return await _connector.signPersonalMessage(msgParams);
    },
  });
};
