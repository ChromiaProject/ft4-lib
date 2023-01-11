export default class ChainConnectionInfo {
  readonly urls: string[];
  readonly brid: Buffer;

  constructor(brid: Buffer, urls: string[]) {
    this.brid = brid;
    this.urls = urls;
  }
}
