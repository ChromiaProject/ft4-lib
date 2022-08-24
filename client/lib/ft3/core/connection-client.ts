import { restClient, gtxClient } from "postchain-client";

export default class ConnectionClient {
  readonly chainURL: string;
  readonly brid: Buffer;
  private gtx;

  constructor(chainURL: string, brid: string | Buffer) {
    this.chainURL = chainURL;
    this.brid = typeof brid === "string" ? Buffer.from(brid, "hex") : brid;
    this.gtx = gtxClient.createClient(
      restClient.createRestClient(chainURL, this.brid.toString("hex"), 5),
      this.brid,
      []
    );
  }

  async query(name: string, params: any): Promise<any> {
    const convertedParams = {};

    for (const name of Object.keys(params)) {
      if (Object.prototype.hasOwnProperty.call(params, name)) {
        convertedParams[name] =
          params[name] === null || params[name] === undefined
            ? null
            : params[name].toGTV();
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
