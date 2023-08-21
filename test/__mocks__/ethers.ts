import { Eip1193Provider } from "ethers";

class MockedBrowserProvider {
  addresses: string[] = [];

  constructor(private externalProvider: Eip1193Provider) {}

  async send() {
    this.addresses = await this.externalProvider.request({ method: "" });
    Promise.resolve();
  }

  getSigner() {
    return {
      getAddress: () => {
        return Promise.resolve(this.addresses[0]);
      },
    };
  }
}

import original = require("ethers");

module.exports = {
  ethers: {
    BrowserProvider: MockedBrowserProvider,
    Wallet: original.Wallet,
    Signature: original.Signature,
  },
};
