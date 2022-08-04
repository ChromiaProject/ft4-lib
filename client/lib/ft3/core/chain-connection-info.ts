export default class ChainConnectionInfo {
  readonly url: string;
  readonly brid: Buffer;

  constructor(brid: Buffer, url: string) {
    this.brid = brid;
    this.url = url;
  }
}
