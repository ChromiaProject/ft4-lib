class MockedBrowserProvider {
  constructor(externalProvider) {
    this.externalProvider = externalProvider;
    this.addresses = [];
  }

  async send() {
    this.addresses = await this.externalProvider.request()
    Promise.resolve()
  }

  getSigner() {
    return {
      getAddress: () => {
        return Promise.resolve(this.addresses[0])
      }
    }
  }
}

const original = require('ethers')

module.exports = {
  ethers: {
    BrowserProvider: MockedBrowserProvider,
    Wallet: original.Wallet,
    Signature: original.Signature,
  }
}

