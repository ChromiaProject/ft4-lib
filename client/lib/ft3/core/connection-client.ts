import { restClient, gtxClient } from "postchain-client";
import { ensureBuffer, Id } from "../../cyptoUtils";
import { toGTV } from "./gtv";

export default class ConnectionClient {
  readonly chainURL: string;
  readonly brid: Buffer;
  private gtx;

  constructor(chainURL: string, brid: Id) {
    this.chainURL = chainURL;
    this.brid = ensureBuffer(brid);
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
        convertedParams[name] = toGTV(params[name]);
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
