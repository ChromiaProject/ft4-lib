import { ethers } from "ethers";
import { createWeb3ProviderEvmKeyStore } from "../client/lib/ft4/authentication/evm/key-stores/web3-provider";
import { ftEventEmitter } from "../client/lib/ft4/events";

jest.mock("../client/lib/ft4/events");

interface MockEip1193Provider extends ethers.Eip1193Provider {
  getSigner: jest.Mock;
  on: jest.Mock;
}

const mockSigner = {
  getAddress: jest.fn(),
};

const mockEip1193Provider: MockEip1193Provider = {
  request: jest.fn(),
  getSigner: jest.fn().mockResolvedValue(mockSigner),
  on: jest.fn(),
};

const mockEthAddress = "0xabc123";

jest.mock("ethers", () => {
  const ActualEthers = jest.requireActual("ethers");

  return {
    ...ActualEthers,
    ethers: {
      ...ActualEthers.ethers,
      BrowserProvider: jest.fn().mockImplementation(() => ({
        send: jest.fn(),
        getSigner: jest.fn().mockResolvedValue({
          getAddress: jest.fn().mockResolvedValue(mockEthAddress),
        }),
      })),
    },
  };
});

describe("Web3 Provider EVM Key Store", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a EvmKeyStore", async () => {
    const result = await createWeb3ProviderEvmKeyStore(mockEip1193Provider);

    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("address");
    expect(result).toHaveProperty("isInteractive", true);
    expect(result).toHaveProperty("signMessage");
    expect(result).toHaveProperty("createKeyHandler");
  });

  it("listens for account changes", async () => {
    await createWeb3ProviderEvmKeyStore(mockEip1193Provider);
    expect(mockEip1193Provider.on).toHaveBeenCalledWith(
      "accountsChanged",
      expect.any(Function),
    );
  });

  it("emits an event on account change", async () => {
    const newAddress = "0xdef456";

    mockEip1193Provider.on.mockImplementationOnce((_, listener) => {
      listener([newAddress]);
    });

    await createWeb3ProviderEvmKeyStore(mockEip1193Provider);

    expect(ftEventEmitter.emit).toHaveBeenCalledWith(
      "AccountAddressChange",
      newAddress,
    );
  });
});
