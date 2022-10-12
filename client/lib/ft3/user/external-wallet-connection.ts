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
    const connector = await ExternalWalletConnection.createConnection();
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
    this.connector = undefined
  }

  private async ensureConnection() {
    if (!this.connector) {
      this.connector = await ExternalWalletConnection.createConnection();
      this.connector.on("connect", this.updateSession.bind(this))
      this.connector.on("session_update", this.updateSession.bind(this))
      this.connector.on("disconnect", this.disconnectSession.bind(this))
    }
  }

  private static async createConnection() {
    const connector = new WalletConnect({
      bridge: BRIDGE_URL,
    });

    await connector.createSession();
    return connector
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
    await this.ensureConnection()

    const msgParams = [
      message, 
      account,
    ];

    return this.connector.signPersonalMessage(msgParams)
  }
}
