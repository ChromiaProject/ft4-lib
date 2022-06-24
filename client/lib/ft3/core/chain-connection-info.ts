export default class ChainConnectionInfo {
  readonly url: string;
  readonly chainId: Buffer;

  constructor(chainId: Buffer, url: string) {
    this.chainId = chainId;
    this.url = url;
  }
}
