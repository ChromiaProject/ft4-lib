import { restClient, gtxClient } from "postchain-client";

export default class ConnectionClient {
  readonly chainURL: string;
  readonly chainId: string;
  private gtx;

  constructor(chainURL: string, chainId: string | Buffer) {
    this.chainURL = chainURL;
    this.chainId =
      typeof chainId === "string" ? chainId : chainId.toString("hex");
    this.gtx = gtxClient.createClient(
      restClient.createRestClient(chainURL, this.chainId, 5),
      Buffer.from(this.chainId, "hex"),
      []
    );
  }

  async query(name: string, params: any): Promise<any> {
    const convertedParams = {};

    for (const name of Object.keys(params)) {
      if (Object.prototype.hasOwnProperty.call(params, name)) {
        convertedParams[name] = params[name].toGTV();
      }
    }

    return await this.gtx.query(name, convertedParams);
  }

  transactionFromRawTransaction(rawTransaction: Buffer): any {
    return this.gtx.transactionFromRawTransaction(rawTransaction);
  }

  newTransaction(signers: Buffer[]): any {
    return this.gtx.newTransaction(signers);
  }
}
