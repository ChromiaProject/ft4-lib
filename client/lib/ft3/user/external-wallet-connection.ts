import WalletConnect from "@walletconnect/client";

interface ConnectionCallbackParams {
  accounts: string[],
  chainId: number,
}

const BRIDGE_URL = "https://bridge.walletconnect.org";
export default class ExternalWalletConnection {
  private _accounts: string[] = []
  private _chainId = 0

  private constructor(private connector: WalletConnect) {}

  public static async init(): Promise<ExternalWalletConnection> {
    const connector = new WalletConnect({
      bridge: BRIDGE_URL,
    });

    await connector.createSession();
    const conn = new ExternalWalletConnection(connector);
    
    connector.on("connect", conn.updateSession.bind(conn))
    connector.on("session_update", conn.updateSession.bind(conn))
    connector.on("disconnect", conn.disconnectSession.bind(conn))

    return conn
  }

  private updateSession(error: Error, params: ConnectionCallbackParams) {
    if (error) {
      throw error;
    }
    this._accounts = params.accounts
    this._chainId = params.chainId
  }
  
  private disconnectSession(error: Error, params: ConnectionCallbackParams) {
    // TODO: Implement disconnection logic
  }

  get connectionUri(): string {
    return this.connector.uri
  }

  get accounts(): string[] {
    return [...this._accounts]
  }

  get chainId(): number {
    return this._chainId
  }

  async signMessage({ message, account }: { message: string, account: string }): Promise<string> {
    const msgParams = [
      message, 
      account,
    ];

    return this.connector.signPersonalMessage(msgParams)
  }
}
