import { restClient, gtxClient, formatter } from "postchain-client";
import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import { BufferId } from "../../cryptoUtils";
import { encodeGtv } from "./gtv";

export default class ConnectionClient {
  readonly chainURLs: string[];
  readonly brid: Buffer;
  private gtx: GtxClient;

  constructor(chainURLs: string[], brid: BufferId) {
    this.chainURLs = chainURLs;
    this.brid = formatter.ensureBuffer(brid);
    this.gtx = gtxClient.createClient(
      restClient.createRestClient(chainURLs, this.brid.toString("hex"), 5),
      this.brid.toString("hex"),
      []
    );
  }

  async query(name: string, params: any): Promise<any> {
    const convertedParams = { type: name };

    for (const name of Object.keys(params)) {
      if (Object.prototype.hasOwnProperty.call(params, name)) {
        convertedParams[name] = encodeGtv(params[name]);
      }
    }

    return await this.gtx.query(convertedParams);
  }

  transactionFromRawTransaction(rawTransaction: Buffer): any {
    return this.gtx.transactionFromRawTransaction(rawTransaction);
  }

  newTransaction(signers: Buffer[]): any {
    return this.gtx.newTransaction(signers);
  }
}
